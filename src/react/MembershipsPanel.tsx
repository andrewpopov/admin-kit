"use client";
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
  // The adapter identity a load or mutation is currently authoritative for.
  // Compared against on every state write that lands after an `await`, so a
  // stale in-flight load or mutation — queued under a previous scope's
  // adapter — can never write into a newer scope's state.
  const currentAdapter = useRef(adapter);

  const load = async () => {
    const loadId = ++latestLoadId.current;
    const forAdapter = adapter;
    setLoadError(undefined);
    try {
      const next = validateAdminMemberships(await forAdapter.list(), forAdapter.roles);
      if (loadId === latestLoadId.current && currentAdapter.current === forAdapter) {
        setMembers(next);
      }
    } catch (reason) {
      if (loadId === latestLoadId.current && currentAdapter.current === forAdapter) {
        setLoadError(reason instanceof Error ? reason.message : "Unable to load members.");
      }
    }
  };

  useEffect(() => {
    // A new adapter is a new scope: drop the previous scope's rows, dialogs,
    // and pending state immediately instead of showing them next to the new
    // scope's label while the new load is pending (or forever, if it fails).
    currentAdapter.current = adapter;
    setMembers(undefined);
    setLoadError(undefined);
    setActionError(undefined);
    setPendingMemberId(undefined);
    setIsAdding(false);
    setRemoveTarget(undefined);
    void load();
    return () => {
      latestLoadId.current += 1;
    };
  }, [adapter]);

  const submitInvite = async (input: InviteInput): Promise<boolean> => {
    if (!adapter.invite) return false;
    const forAdapter = adapter;
    setIsAdding(true);
    setActionError(undefined);
    try {
      await adapter.invite.execute(input);
      if (currentAdapter.current !== forAdapter) return true;
      await load();
      return true;
    } catch (reason) {
      if (currentAdapter.current === forAdapter) {
        setActionError(reason instanceof Error ? reason.message : "Unable to add the member.");
      }
      return false;
    } finally {
      if (currentAdapter.current === forAdapter) setIsAdding(false);
    }
  };

  const updateRole = async (memberId: string, role: string) => {
    if (!adapter.setRole) return;
    const forAdapter = adapter;
    setPendingMemberId(memberId);
    setActionError(undefined);
    try {
      await adapter.setRole.execute({ memberId, role });
      if (currentAdapter.current !== forAdapter) return;
      await load();
    } catch (reason) {
      if (currentAdapter.current === forAdapter) {
        setActionError(
          reason instanceof Error ? reason.message : "Unable to update the member role.",
        );
      }
    } finally {
      if (currentAdapter.current === forAdapter) setPendingMemberId(undefined);
    }
  };

  const remove = async (memberId: string) => {
    if (!adapter.remove) return;
    const forAdapter = adapter;
    setPendingMemberId(memberId);
    setActionError(undefined);
    try {
      await adapter.remove.execute({ memberId });
      if (currentAdapter.current !== forAdapter) return;
      await load();
      setRemoveTarget(undefined);
    } catch (reason) {
      if (currentAdapter.current === forAdapter) {
        setActionError(reason instanceof Error ? reason.message : "Unable to remove the member.");
        setRemoveTarget(undefined);
      }
    } finally {
      if (currentAdapter.current === forAdapter) setPendingMemberId(undefined);
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
