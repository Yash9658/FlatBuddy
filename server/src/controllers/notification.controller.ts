import { UserRole } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

type NotificationItem = {
  id: string;
  kind: "CONNECTION" | "CHAT" | "VISIT" | "ADMIN" | "BILLING" | "VERIFICATION" | "GROUP";
  title: string;
  description: string;
  createdAt: Date;
  href: string;
  isUnread?: boolean;
};

export async function getNotifications(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const userId = req.auth.userId;
  const notifications: NotificationItem[] = [];

  const [currentUser, incomingConnections, incomingGroupInvitations, unreadChatParticipants, outgoingVisits, landlordVisits, openReports, pendingVerificationRequests, storedNotifications] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          subscription: true,
          landlordVerificationStatus: true,
          landlordVerificationRequestedAt: true,
          landlordVerifiedAt: true,
          landlordVerificationNotes: true,
        },
      }),
      prisma.connectionRequest.findMany({
        where: {
          receiverId: userId,
          status: "PENDING",
        },
        include: {
          sender: {
            select: {
              email: true,
              profile: true,
            },
          },
          city: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.groupInvitation.findMany({
        where: {
          inviteeUserId: userId,
          status: "PENDING",
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
          inviter: {
            select: {
              email: true,
              profile: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.chatParticipant.findMany({
        where: {
          userId,
        },
        include: {
          chat: {
            include: {
              participants: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      profile: true,
                    },
                  },
                },
              },
              messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          chat: {
            updatedAt: "desc",
          },
        },
        take: 8,
      }),
      prisma.visitRequest.findMany({
        where: {
          requesterId: userId,
          status: {
            in: ["APPROVED", "DECLINED"],
          },
        },
        include: {
          property: {
            select: {
              title: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.visitRequest.findMany({
        where: {
          property: {
            ownerId: userId,
          },
          status: "PENDING",
        },
        include: {
          property: {
            select: {
              title: true,
            },
          },
          requester: {
            select: {
              email: true,
              profile: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      req.auth.role === UserRole.ADMIN
        ? prisma.report.findMany({
            where: {
              resolved: false,
            },
            include: {
              property: {
                select: {
                  title: true,
                },
              },
              reportedUser: {
                select: {
                  email: true,
                  profile: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
      req.auth.role === UserRole.ADMIN
        ? prisma.user.findMany({
            where: {
              role: UserRole.LANDLORD,
              landlordVerificationStatus: "PENDING",
            },
            select: {
              id: true,
              email: true,
              landlordVerificationRequestedAt: true,
              profile: true,
            },
            orderBy: { landlordVerificationRequestedAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
      prisma.userNotification.findMany({
        where: {
          userId,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  incomingConnections.forEach((connection) => {
    notifications.push({
      id: `connection-${connection.id}`,
      kind: "CONNECTION",
      title: "New partner request",
      description: `${connection.sender.profile?.fullName ?? connection.sender.email} wants to connect${
        connection.city?.name ? ` in ${connection.city.name}` : ""
      }.`,
      createdAt: connection.createdAt,
      href: "/inbox",
    });
  });

  incomingGroupInvitations.forEach((invitation) => {
    notifications.push({
      id: `group-invite-${invitation.id}`,
      kind: "GROUP",
      title: "Group invite pending",
      description: `${invitation.inviter.profile?.fullName ?? invitation.inviter.email} invited you to join ${invitation.group.name}.`,
      createdAt: invitation.createdAt,
      href: "/groups",
    });
  });

  storedNotifications.forEach((item) => {
    if (item.kind !== "GROUP") {
      return;
    }

    notifications.push({
      id: `stored-${item.id}`,
      kind: "GROUP",
      title: item.title,
      description: item.description,
      createdAt: item.createdAt,
      href: item.href,
    });
  });

  unreadChatParticipants.forEach((participant) => {
    const latestMessage = participant.chat.messages[0];

    if (!latestMessage) {
      return;
    }

    if (participant.lastReadAt && latestMessage.createdAt <= participant.lastReadAt) {
      return;
    }

    const otherParticipant = participant.chat.participants.find((item) => item.user.id !== userId)?.user;

    notifications.push({
      id: `chat-${participant.chatId}-${latestMessage.id}`,
      kind: "CHAT",
      title: participant.chat.isGroup ? "New group chat activity" : "New message",
      description: participant.chat.isGroup
        ? latestMessage.body
        : `${otherParticipant?.profile?.fullName ?? otherParticipant?.email ?? "A partner"}: ${latestMessage.body}`,
      createdAt: latestMessage.createdAt,
      href: "/inbox",
    });
  });

  outgoingVisits.forEach((visit) => {
    notifications.push({
      id: `visit-requester-${visit.id}`,
      kind: "VISIT",
      title: visit.status === "APPROVED" ? "Visit approved" : "Visit update",
      description: `${visit.property.title} is now ${visit.status.toLowerCase()}.`,
      createdAt: visit.updatedAt,
      href: "/properties",
    });
  });

  landlordVisits.forEach((visit) => {
    notifications.push({
      id: `visit-landlord-${visit.id}`,
      kind: "VISIT",
      title: "New property visit request",
      description: `${visit.requester.profile?.fullName ?? visit.requester.email} requested a visit for ${
        visit.property.title
      }.`,
      createdAt: visit.createdAt,
      href: "/landlord",
    });
  });

  openReports.forEach((report) => {
    notifications.push({
      id: `report-${report.id}`,
      kind: "ADMIN",
      title: "Open moderation case",
      description: report.property?.title
        ? `${report.reason} on ${report.property.title}.`
        : `${report.reason} reported against ${report.reportedUser?.profile?.fullName ?? report.reportedUser?.email ?? "a user"}.`,
      createdAt: report.createdAt,
      href: "/admin",
    });
  });

  pendingVerificationRequests.forEach((request) => {
    notifications.push({
      id: `verification-review-${request.id}-${request.landlordVerificationRequestedAt?.toISOString() ?? "pending"}`,
      kind: "ADMIN",
      title: "Landlord verification review pending",
      description: `${request.profile?.fullName ?? request.email} submitted verification documents for review.`,
      createdAt: request.landlordVerificationRequestedAt ?? new Date(),
      href: "/admin",
    });
  });

  if (
    currentUser?.landlordVerificationStatus === "PENDING" &&
    currentUser.landlordVerificationRequestedAt
  ) {
    notifications.push({
      id: `verification-status-pending-${currentUser.landlordVerificationRequestedAt.toISOString()}`,
      kind: "VERIFICATION",
      title: "Verification request submitted",
      description: "Your landlord verification request is under review.",
      createdAt: currentUser.landlordVerificationRequestedAt,
      href: "/landlord",
    });
  }

  if (currentUser?.landlordVerificationStatus === "APPROVED" && currentUser.landlordVerifiedAt) {
    notifications.push({
      id: `verification-status-approved-${currentUser.landlordVerifiedAt.toISOString()}`,
      kind: "VERIFICATION",
      title: "Landlord verification approved",
      description: "Your listings can now show a stronger trust signal across FlatBuddy.",
      createdAt: currentUser.landlordVerifiedAt,
      href: "/landlord",
    });
  }

  if (
    currentUser?.landlordVerificationStatus === "REJECTED" &&
    currentUser.landlordVerificationRequestedAt
  ) {
    notifications.push({
      id: `verification-status-rejected-${currentUser.landlordVerificationRequestedAt.toISOString()}`,
      kind: "VERIFICATION",
      title: "Landlord verification needs attention",
      description: currentUser.landlordVerificationNotes ?? "Please review your submission details and resubmit.",
      createdAt: currentUser.landlordVerificationRequestedAt,
      href: "/landlord",
    });
  }

  if (currentUser?.subscription?.cancelAtPeriodEnd && currentUser.subscription.currentPeriodEnd) {
    notifications.push({
      id: `billing-${currentUser.subscription.id}`,
      kind: "BILLING",
      title: "Subscription will end soon",
      description: `Your ${currentUser.subscription.plan === "TENANT_PRO" ? "Tenant Pro" : "Landlord Pro"} plan is set to end at the current billing period.`,
      createdAt: currentUser.subscription.updatedAt,
      href: "/pricing",
    });
  }

  const sortedNotifications = notifications
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 25);

  const notificationReads = await prisma.notificationRead.findMany({
    where: {
      userId,
      notificationKey: {
        in: sortedNotifications.map((item) => item.id),
      },
    },
    select: {
      notificationKey: true,
    },
  });

  const readKeys = new Set(notificationReads.map((item) => item.notificationKey));
  const serializedNotifications = sortedNotifications.map((notification) => ({
    ...notification,
    isUnread: !readKeys.has(notification.id),
    createdAt: notification.createdAt.toISOString(),
  }));

  return res.json({
    notifications: serializedNotifications,
    unreadCount: serializedNotifications.filter((item) => item.isUnread).length,
  });
}

export async function markNotificationRead(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const notificationKey = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;

  await prisma.notificationRead.upsert({
    where: {
      userId_notificationKey: {
        userId: req.auth.userId,
        notificationKey,
      },
    },
    update: {
      readAt: new Date(),
    },
    create: {
      userId: req.auth.userId,
      notificationKey,
    },
  });

  return res.status(204).send();
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const notificationsResponse: Response | null = null;
  void notificationsResponse;

  const userId = req.auth.userId;
  const notifications: NotificationItem[] = [];

  const [currentUser, incomingConnections, incomingGroupInvitations, unreadChatParticipants, outgoingVisits, landlordVisits, openReports, pendingVerificationRequests, storedNotifications] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          subscription: true,
          landlordVerificationStatus: true,
          landlordVerificationRequestedAt: true,
          landlordVerifiedAt: true,
          landlordVerificationNotes: true,
        },
      }),
      prisma.connectionRequest.findMany({
        where: {
          receiverId: userId,
          status: "PENDING",
        },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.groupInvitation.findMany({
        where: {
          inviteeUserId: userId,
          status: "PENDING",
        },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.chatParticipant.findMany({
        where: { userId },
        include: {
          chat: {
            include: {
              messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          chat: {
            updatedAt: "desc",
          },
        },
        take: 8,
      }),
      prisma.visitRequest.findMany({
        where: {
          requesterId: userId,
          status: {
            in: ["APPROVED", "DECLINED"],
          },
        },
        select: {
          id: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.visitRequest.findMany({
        where: {
          property: {
            ownerId: userId,
          },
          status: "PENDING",
        },
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      req.auth.role === UserRole.ADMIN
        ? prisma.report.findMany({
            where: { resolved: false },
            select: { id: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
      req.auth.role === UserRole.ADMIN
        ? prisma.user.findMany({
            where: {
              role: UserRole.LANDLORD,
              landlordVerificationStatus: "PENDING",
            },
            select: {
              id: true,
              landlordVerificationRequestedAt: true,
            },
            orderBy: { landlordVerificationRequestedAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
      prisma.userNotification.findMany({
        where: {
          userId,
        },
        select: {
          id: true,
          kind: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  incomingConnections.forEach((item) => {
    notifications.push({ id: `connection-${item.id}`, kind: "CONNECTION", title: "", description: "", createdAt: item.createdAt, href: "" });
  });
  incomingGroupInvitations.forEach((item) => {
    notifications.push({ id: `group-invite-${item.id}`, kind: "GROUP", title: "", description: "", createdAt: item.createdAt, href: "" });
  });
  storedNotifications.forEach((item) => {
    if (item.kind !== "GROUP") {
      return;
    }

    notifications.push({
      id: `stored-${item.id}`,
      kind: "GROUP",
      title: "",
      description: "",
      createdAt: item.createdAt,
      href: "",
    });
  });
  unreadChatParticipants.forEach((item) => {
    const latestMessage = item.chat.messages[0];
    if (latestMessage && (!item.lastReadAt || latestMessage.createdAt > item.lastReadAt)) {
      notifications.push({
        id: `chat-${item.chatId}-${latestMessage.id}`,
        kind: "CHAT",
        title: "",
        description: "",
        createdAt: latestMessage.createdAt,
        href: "",
      });
    }
  });
  outgoingVisits.forEach((item) => {
    notifications.push({ id: `visit-requester-${item.id}`, kind: "VISIT", title: "", description: "", createdAt: item.updatedAt, href: "" });
  });
  landlordVisits.forEach((item) => {
    notifications.push({ id: `visit-landlord-${item.id}`, kind: "VISIT", title: "", description: "", createdAt: item.createdAt, href: "" });
  });
  openReports.forEach((item) => {
    notifications.push({ id: `report-${item.id}`, kind: "ADMIN", title: "", description: "", createdAt: item.createdAt, href: "" });
  });
  pendingVerificationRequests.forEach((item) => {
    notifications.push({
      id: `verification-review-${item.id}-${item.landlordVerificationRequestedAt?.toISOString() ?? "pending"}`,
      kind: "ADMIN",
      title: "",
      description: "",
      createdAt: item.landlordVerificationRequestedAt ?? new Date(),
      href: "",
    });
  });
  if (currentUser?.landlordVerificationStatus === "PENDING" && currentUser.landlordVerificationRequestedAt) {
    notifications.push({
      id: `verification-status-pending-${currentUser.landlordVerificationRequestedAt.toISOString()}`,
      kind: "VERIFICATION",
      title: "",
      description: "",
      createdAt: currentUser.landlordVerificationRequestedAt,
      href: "",
    });
  }
  if (currentUser?.landlordVerificationStatus === "APPROVED" && currentUser.landlordVerifiedAt) {
    notifications.push({
      id: `verification-status-approved-${currentUser.landlordVerifiedAt.toISOString()}`,
      kind: "VERIFICATION",
      title: "",
      description: "",
      createdAt: currentUser.landlordVerifiedAt,
      href: "",
    });
  }
  if (currentUser?.landlordVerificationStatus === "REJECTED" && currentUser.landlordVerificationRequestedAt) {
    notifications.push({
      id: `verification-status-rejected-${currentUser.landlordVerificationRequestedAt.toISOString()}`,
      kind: "VERIFICATION",
      title: "",
      description: "",
      createdAt: currentUser.landlordVerificationRequestedAt,
      href: "",
    });
  }
  if (currentUser?.subscription?.cancelAtPeriodEnd && currentUser.subscription.currentPeriodEnd) {
    notifications.push({
      id: `billing-${currentUser.subscription.id}`,
      kind: "BILLING",
      title: "",
      description: "",
      createdAt: currentUser.subscription.updatedAt,
      href: "",
    });
  }

  const visibleNotifications = notifications
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 25);

  await prisma.notificationRead.createMany({
    data: visibleNotifications.map((notification) => ({
      userId,
      notificationKey: notification.id,
      readAt: new Date(),
    })),
    skipDuplicates: true,
  });

  return res.status(204).send();
}
