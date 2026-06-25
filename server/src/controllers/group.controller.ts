import { GroupInvitationStatus, UserRole } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const createGroupSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(240).optional(),
  cityId: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
});

const updateGroupPlanSchema = z.object({
  description: z.string().max(240).optional(),
  planningNotes: z.string().max(1200).optional(),
});

const addShortlistSchema = z.object({
  propertyId: z.string().min(1),
  note: z.string().max(240).optional(),
});

const inviteGroupMemberSchema = z.object({
  inviteeUserId: z.string().min(1),
});

const respondToGroupInviteSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
});

const groupInclude = {
  city: true,
  owner: {
    select: {
      id: true,
      email: true,
      role: true,
      profile: {
        include: {
          targetCity: true,
        },
      },
    },
  },
  members: {
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: {
            include: {
              targetCity: true,
            },
          },
          preference: true,
        },
      },
    },
    orderBy: [{ isLeader: "desc" as const }, { joinedAt: "asc" as const }],
  },
  shortlists: {
    include: {
      addedBy: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: {
            include: {
              targetCity: true,
            },
          },
        },
      },
      property: {
        include: {
          city: true,
          images: {
            orderBy: { sortOrder: "asc" as const },
          },
          owner: {
            select: {
              id: true,
              email: true,
              role: true,
              profile: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
  invitations: {
    include: {
      inviter: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: true,
        },
      },
      invitee: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: true,
        },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
};

async function getGroupMembership(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
    },
    select: {
      id: true,
      isLeader: true,
    },
  });

  return membership;
}

async function getAcceptedConnectionUserIds(userId: string) {
  const connections = await prisma.connectionRequest.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    select: {
      senderId: true,
      receiverId: true,
    },
  });

  const connectedUserIds = new Set<string>();
  connections.forEach((connection) => {
    connectedUserIds.add(connection.senderId === userId ? connection.receiverId : connection.senderId);
  });

  return connectedUserIds;
}

async function createGroupNotifications(
  userIds: string[],
  title: string,
  description: string,
  href = "/groups",
) {
  const uniqueUserIds = [...new Set(userIds)];

  if (uniqueUserIds.length === 0) {
    return;
  }

  await prisma.userNotification.createMany({
    data: uniqueUserIds.map((userId) => ({
      userId,
      kind: "GROUP",
      title,
      description,
      href,
    })),
  });
}

export async function listGroups(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: {
          userId: req.auth.userId,
        },
      },
    },
    include: {
      ...groupInclude,
    },
    orderBy: { updatedAt: "desc" },
  });

  return res.json(groups);
}

export async function createGroup(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const auth = req.auth;

  if (auth.role !== UserRole.TENANT && auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Only tenant accounts can create groups." });
  }

  const payload = createGroupSchema.parse(req.body);
  const uniqueMemberIds = [...new Set([auth.userId, ...payload.memberIds])];

  if (payload.cityId) {
    const city = await prisma.city.findUnique({
      where: { id: payload.cityId },
      select: { id: true },
    });

    if (!city) {
      return res.status(400).json({ message: "Selected city is not valid." });
    }
  }

  const connections = await prisma.connectionRequest.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        {
          senderId: auth.userId,
          receiverId: {
            in: uniqueMemberIds.filter((id) => id !== auth.userId),
          },
        },
        {
          receiverId: auth.userId,
          senderId: {
            in: uniqueMemberIds.filter((id) => id !== auth.userId),
          },
        },
      ],
    },
  });

  const connectedUserIds = new Set<string>();
  connections.forEach((connection) => {
    connectedUserIds.add(connection.senderId === auth.userId ? connection.receiverId : connection.senderId);
  });

  const invalidMemberId = uniqueMemberIds.find(
    (memberId) => memberId !== auth.userId && !connectedUserIds.has(memberId),
  );

  if (invalidMemberId) {
    return res.status(400).json({
      message: "Only accepted tenant connections can be added to a group.",
    });
  }

  const group = await prisma.group.create({
    data: {
      ownerUserId: auth.userId,
      cityId: payload.cityId,
      name: payload.name,
      description: payload.description,
      planningNotes: null,
      members: {
        create: {
          userId: auth.userId,
          isLeader: true,
        },
      },
      invitations: {
        create: uniqueMemberIds
          .filter((userId) => userId !== auth.userId)
          .map((userId) => ({
            inviterUserId: auth.userId,
            inviteeUserId: userId,
          })),
      },
    },
    include: groupInclude,
  });

  return res.status(201).json(group);
}

export async function getGroupById(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const groupId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const membership = await getGroupMembership(groupId, req.auth.userId);

  if (!membership && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "You are not part of this group." });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: groupInclude,
  });

  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  return res.json(group);
}

export async function updateGroupPlan(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const groupId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const membership = await getGroupMembership(groupId, req.auth.userId);

  if ((!membership || !membership.isLeader) && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Only the group leader can update the group plan." });
  }

  const payload = updateGroupPlanSchema.parse(req.body);

  const group = await prisma.group.update({
    where: { id: groupId },
    data: {
      description: payload.description,
      planningNotes: payload.planningNotes,
    },
    include: groupInclude,
  });

  return res.json(group);
}

export async function addGroupShortlist(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const groupId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const membership = await getGroupMembership(groupId, req.auth.userId);

  if (!membership && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "You are not part of this group." });
  }

  const payload = addShortlistSchema.parse(req.body);

  const [group, property] = await Promise.all([
    prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        cityId: true,
      },
    }),
    prisma.property.findUnique({
      where: { id: payload.propertyId },
      select: {
        id: true,
        cityId: true,
        status: true,
      },
    }),
  ]);

  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  if (!property || property.status !== "ACTIVE") {
    return res.status(404).json({ message: "Property not available for shortlisting." });
  }

  if (group.cityId && property.cityId !== group.cityId) {
    return res.status(400).json({ message: "This property is outside the group's target city." });
  }

  await prisma.groupShortlistedProperty.upsert({
    where: {
      groupId_propertyId: {
        groupId,
        propertyId: payload.propertyId,
      },
    },
    update: {
      note: payload.note,
      addedByUserId: req.auth.userId,
    },
    create: {
      groupId,
      propertyId: payload.propertyId,
      note: payload.note,
      addedByUserId: req.auth.userId,
    },
  });

  const updatedGroup = await prisma.group.findUnique({
    where: { id: groupId },
    include: groupInclude,
  });

  return res.status(201).json(updatedGroup);
}

export async function inviteGroupMember(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const groupId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const payload = inviteGroupMemberSchema.parse(req.body);

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      ownerUserId: true,
      members: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  if (req.auth.role !== UserRole.ADMIN && group.ownerUserId !== req.auth.userId) {
    return res.status(403).json({ message: "Only the group leader can invite new members." });
  }

  if (group.members.some((member) => member.userId === payload.inviteeUserId)) {
    return res.status(400).json({ message: "This partner is already part of the group." });
  }

  const [targetUser, connectedUserIds] = await Promise.all([
    prisma.user.findUnique({
      where: { id: payload.inviteeUserId },
      select: {
        id: true,
        role: true,
      },
    }),
    getAcceptedConnectionUserIds(group.ownerUserId),
  ]);

  if (!targetUser || (targetUser.role !== UserRole.TENANT && targetUser.role !== UserRole.ADMIN)) {
    return res.status(404).json({ message: "Only tenant partners can be invited into a group." });
  }

  if (req.auth.role !== UserRole.ADMIN && !connectedUserIds.has(payload.inviteeUserId)) {
    return res.status(400).json({ message: "Only accepted tenant connections can be invited to a group." });
  }

  await prisma.groupInvitation.upsert({
    where: {
      groupId_inviteeUserId: {
        groupId,
        inviteeUserId: payload.inviteeUserId,
      },
    },
    update: {
      inviterUserId: req.auth.userId,
      status: GroupInvitationStatus.PENDING,
      respondedAt: null,
    },
    create: {
      groupId,
      inviterUserId: req.auth.userId,
      inviteeUserId: payload.inviteeUserId,
      status: GroupInvitationStatus.PENDING,
    },
  });

  const updatedGroup = await prisma.group.findUnique({
    where: { id: groupId },
    include: groupInclude,
  });

  return res.status(201).json(updatedGroup);
}

export async function listGroupInvitations(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const [incoming, outgoing] = await Promise.all([
    prisma.groupInvitation.findMany({
      where: {
        inviteeUserId: req.auth.userId,
        status: GroupInvitationStatus.PENDING,
      },
      include: {
        group: {
          include: {
            city: true,
          },
        },
        inviter: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.groupInvitation.findMany({
      where: {
        inviterUserId: req.auth.userId,
        status: GroupInvitationStatus.PENDING,
      },
      include: {
        group: {
          include: {
            city: true,
          },
        },
        invitee: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return res.json({
    incoming,
    outgoing,
  });
}

export async function respondToGroupInvitation(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const invitationId = Array.isArray(req.params.invitationId) ? req.params.invitationId[0] : req.params.invitationId;
  const payload = respondToGroupInviteSchema.parse(req.body);

  const invitation = await prisma.groupInvitation.findUnique({
    where: { id: invitationId },
    include: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      invitee: {
        select: {
          email: true,
          profile: true,
        },
      },
    },
  });

  if (!invitation) {
    return res.status(404).json({ message: "Invitation not found." });
  }

  if (req.auth.role !== UserRole.ADMIN && invitation.inviteeUserId !== req.auth.userId) {
    return res.status(403).json({ message: "You cannot respond to this invitation." });
  }

  if (invitation.status !== GroupInvitationStatus.PENDING) {
    return res.status(400).json({ message: "This invitation has already been handled." });
  }

  if (payload.action === "ACCEPT") {
    await prisma.$transaction([
      prisma.groupMember.upsert({
        where: {
          groupId_userId: {
            groupId: invitation.groupId,
            userId: invitation.inviteeUserId,
          },
        },
        update: {},
        create: {
          groupId: invitation.groupId,
          userId: invitation.inviteeUserId,
          isLeader: false,
        },
      }),
      prisma.groupInvitation.update({
        where: { id: invitationId },
        data: {
          status: GroupInvitationStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      }),
    ]);

    const currentMembers = await prisma.groupMember.findMany({
      where: {
        groupId: invitation.groupId,
        userId: {
          not: invitation.inviteeUserId,
        },
      },
      select: {
        userId: true,
      },
    });

    await createGroupNotifications(
      currentMembers.map((member) => member.userId),
      "New group member joined",
      `${invitation.invitee.profile?.fullName ?? invitation.invitee.email} joined ${invitation.group.name}.`,
    );
  } else {
    await prisma.groupInvitation.update({
      where: { id: invitationId },
      data: {
        status: GroupInvitationStatus.DECLINED,
        respondedAt: new Date(),
      },
    });
  }

  return res.status(200).json({ success: true });
}

export async function removeGroupShortlist(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const groupId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const propertyId = Array.isArray(req.params.propertyId) ? req.params.propertyId[0] : req.params.propertyId;
  const membership = await getGroupMembership(groupId, req.auth.userId);

  if ((!membership || !membership.isLeader) && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Only the group leader can remove shortlisted properties." });
  }

  await prisma.groupShortlistedProperty.delete({
    where: {
      groupId_propertyId: {
        groupId,
        propertyId,
      },
    },
  });

  const updatedGroup = await prisma.group.findUnique({
    where: { id: groupId },
    include: groupInclude,
  });

  return res.json(updatedGroup);
}

export async function leaveGroup(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const groupId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const membership = await getGroupMembership(groupId, req.auth.userId);

  if (!membership) {
    return res.status(404).json({ message: "You are not part of this group." });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      ownerUserId: true,
      name: true,
      members: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  if (group.ownerUserId === req.auth.userId || membership.isLeader) {
    return res.status(400).json({
      message: "Group leaders cannot leave directly. Delete the group instead.",
    });
  }

  const leavingUser = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    select: {
      email: true,
      profile: true,
    },
  });

  await prisma.groupMember.delete({
    where: {
      groupId_userId: {
        groupId,
        userId: req.auth.userId,
      },
    },
  });

  await createGroupNotifications(
    group.members
      .map((member) => member.userId)
      .filter((userId) => userId !== req.auth?.userId),
    "Group member left",
    `${leavingUser?.profile?.fullName ?? leavingUser?.email ?? "A member"} left ${group.name}.`,
  );

  return res.status(204).send();
}

export async function deleteGroup(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const groupId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      ownerUserId: true,
    },
  });

  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  if (req.auth.role !== UserRole.ADMIN && group.ownerUserId !== req.auth.userId) {
    return res.status(403).json({ message: "Only the group leader can delete this group." });
  }

  await prisma.group.delete({
    where: { id: groupId },
  });

  return res.status(204).send();
}
