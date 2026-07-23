import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  validateAdminMemberships,
  type AdminMembershipSummary,
  type AdminMembershipsAdapter,
} from "../core";
import { AdminConfirmationDialog } from "./AdminConfirmationDialog";
import { AdminPanelStateView } from "./AdminPanelState";

export interface MembershipsPanelProps<
  InviteInput = never,
  Member extends AdminMembershipSummary = AdminMembershipSummary,
> {
  adapter: AdminMembershipsAdapter<InviteInput, Member>;
  title?: string;
  /** Host-owned account search or invitation form; the package owns its mutation lifecycle. */
  renderAddMember?: (context: {
    submit: (input: InviteInput) => Promise<boolean>;
    reload: () => Promise<void>;
    isPending: boolean;
  }) => ReactNode;
  /** Optional host actions that do not replace shared role and remove controls. */
  renderMemberActions?: (
    member: Member,
    context: { reload: () => Promise<void>; isPending: boolean },
  ) => ReactNode;
  getRemoveDescription?: (member: Member) => string;
  dialogClassName?: string;
  className?: string;
}

/**
 * Scoped membership administration. Hosts own identity discovery, invitation
 * delivery, authorization, inheritance, transport, and audit policy.
 */
export function MembershipsPanel<
  InviteInput = never,
  Member extends AdminMembershipSummary = AdminMembershipSummary,
>({
  adapter,
  title = "Members",
  renderAddMember,
  renderMemberActions,
  getRemoveDescription,
  dialogClassName,
  className,
}: MembershipsPanelProps<InviteInput, Member>) {
  const [members, setMembers] = useState<readonly Member[]>();
  const [loadError, setLoadError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [pendingMemberId, setPendingMemberId] = useState<string>();
  const [isAdding, setIsAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member>();
  const latestLoadId = useRef(0);

  const load = async () => {
    const loadId = ++latestLoadId.current;
    setLoadError(undefined);
    try {
      const next = validateAdminMemberships(await adapter.list(), adapter.roles);
      if (loadId === latestLoadId.current) setMembers(next);
    } catch (reason) {
      if (loadId === latestLoadId.current) {
        setLoadError(reason instanceof Error ? reason.message : "Unable to load members.");
      }
    }
  };

  useEffect(() => {
    void load();
    return () => {
      latestLoadId.current += 1;
    };
  }, [adapter]);

  const submitInvite = async (input: InviteInput): Promise<boolean> => {
    if (!adapter.invite) return false;
    setIsAdding(true);
    setActionError(undefined);
    try {
      await adapter.invite.execute(input);
      await load();
      return true;
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Unable to add the member.");
      return false;
    } finally {
      setIsAdding(false);
    }
  };

  const updateRole = async (memberId: string, role: string) => {
    if (!adapter.setRole) return;
    setPendingMemberId(memberId);
    setActionError(undefined);
    try {
      await adapter.setRole.execute({ memberId, role });
      await load();
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Unable to update the member role.",
      );
    } finally {
      setPendingMemberId(undefined);
    }
  };

  const remove = async (memberId: string) => {
    if (!adapter.remove) return;
    setPendingMemberId(memberId);
    setActionError(undefined);
    try {
      await adapter.remove.execute({ memberId });
      await load();
      setRemoveTarget(undefined);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Unable to remove the member.");
      setRemoveTarget(undefined);
    } finally {
      setPendingMemberId(undefined);
    }
  };

  if (loadError && !members) {
    return (
      <AdminPanelStateView
        className={className}
        state={{ kind: "error", detail: loadError, onRetry: () => void load() }}
      />
    );
  }
  if (!members) {
    return (
      <AdminPanelStateView
        className={className}
        state={{ kind: "loading", label: "Loading members…" }}
      />
    );
  }

  const hasActions = Boolean(
    renderMemberActions ||
    (adapter.remove &&
      members.some((member) => member.mutable && member.permissions?.canRemove !== false)),
  );
  return (
    <section
      className={["admin-kit__memberships", className].filter(Boolean).join(" ")}
      aria-label={title}
    >
      <header className="admin-kit__memberships-header">
        <div>
          <h2>{title}</h2>
          <p>
            {adapter.scope.label} · {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        {renderAddMember && adapter.invite
          ? renderAddMember({ submit: submitInvite, reload: load, isPending: isAdding })
          : null}
      </header>
      {loadError ? (
        <AdminPanelStateView
          state={{ kind: "error", detail: loadError, onRetry: () => void load() }}
        />
      ) : null}
      {actionError ? (
        <p className="admin-kit__action-error" role="alert">
          {actionError}
        </p>
      ) : null}
      {members.length === 0 ? (
        <AdminPanelStateView state={{ kind: "empty", title: "No members found." }} />
      ) : (
        <div className="admin-kit__table-wrap admin-kit__memberships-table-wrap">
          <table className="admin-kit__table admin-kit__memberships-table">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Access</th>
                <th scope="col">Role</th>
                {hasActions ? <th scope="col">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const pending = pendingMemberId === member.memberId;
                const canChangeRole =
                  member.mutable &&
                  member.permissions?.canChangeRole !== false &&
                  Boolean(adapter.setRole);
                const canRemove =
                  member.mutable &&
                  member.permissions?.canRemove !== false &&
                  Boolean(adapter.remove);
                const role = adapter.roles.find((candidate) => candidate.value === member.role)!;
                return (
                  <tr key={member.memberId} aria-busy={pending}>
                    <td>
                      <div className="admin-kit__membership-identity">
                        <strong>{member.label}</strong>
                        {member.secondaryLabel ? <span>{member.secondaryLabel}</span> : null}
                      </div>
                    </td>
                    <td>
                      <span className="admin-kit__membership-source">
                        {member.source === "inherited" ? "Inherited" : "Direct"}
                      </span>
                    </td>
                    <td>
                      {canChangeRole ? (
                        <select
                          aria-label={`Role for ${member.label}`}
                          disabled={pending}
                          value={member.role}
                          onChange={(event) => void updateRole(member.memberId, event.target.value)}
                        >
                          {adapter.roles.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`admin-kit__membership-role admin-kit__membership-role--${role.tone ?? "neutral"}`}
                        >
                          {role.label}
                        </span>
                      )}
                    </td>
                    {hasActions ? (
                      <td>
                        <div className="admin-kit__membership-controls">
                          {renderMemberActions
                            ? renderMemberActions(member, { reload: load, isPending: pending })
                            : null}
                          {canRemove ? (
                            <button
                              className="admin-kit__button"
                              disabled={pending}
                              type="button"
                              onClick={() => setRemoveTarget(member)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {adapter.remove ? (
        <AdminConfirmationDialog
          className={dialogClassName}
          open={Boolean(removeTarget)}
          title="Remove member"
          description={
            removeTarget
              ? (getRemoveDescription?.(removeTarget) ??
                `Remove ${removeTarget.label} from ${adapter.scope.label}? Their access through this direct membership will end.`)
              : ""
          }
          confirmLabel="Remove member"
          danger
          pending={Boolean(removeTarget && pendingMemberId === removeTarget.memberId)}
          onCancel={() => setRemoveTarget(undefined)}
          onConfirm={() => removeTarget && void remove(removeTarget.memberId)}
        />
      ) : null}
    </section>
  );
}
