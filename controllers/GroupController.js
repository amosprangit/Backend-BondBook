import Group from "../models/GroupModel.js";
import User from "../models/userModel.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, description, groupImage, members = [] } = req.body;

    // Get authenticated user
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Validate group name
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }

    // Make sure members is an array
    if (!Array.isArray(members)) {
      return res.status(400).json({
        success: false,
        message: "Members must be an array",
      });
    }

    // Remove duplicate members
    const uniqueMembers = [...new Set(members.map(String))];

    // Make sure all supplied users exist
    if (uniqueMembers.length > 0) {
      const existingUsers = await User.find({
        _id: { $in: uniqueMembers },
      }).select("_id");

      if (existingUsers.length !== uniqueMembers.length) {
        return res.status(400).json({
          success: false,
          message: "One or more members do not exist",
        });
      }
    }

    // Creator must always be a member
    const allMembers = [...new Set([String(userId), ...uniqueMembers])];

    // Create group
    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || "",
      groupImage: groupImage || "",
      createdBy: userId,
      admins: [userId],
      members: allMembers,
    });

    // Return populated group
    const populatedGroup = await Group.findById(group._id)
      .populate("createdBy", "name email profilePicture")
      .populate("admins", "name email profilePicture")
      .populate("members", "name email profilePicture");

    return res.status(201).json({
      success: true,
      message: "Group created successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Create group error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create group",
      error: error.message,
    });
  }
};

// Get all groups of logged-in user
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const groups = await Group.find({
      members: userId,
    })
      .populate("createdBy", "name email profilePicture")
      .populate("admins", "name email profilePicture")
      .populate("members", "name email profilePicture")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: groups.length,
      groups,
    });
  } catch (error) {
    console.error("Get groups error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch groups",
      error: error.message,
    });
  }
};

// Get a specific group
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;

    const userId = req.user.userId || req.user.id || req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const group = await Group.findById(groupId)
      .populate("createdBy", "name email profilePicture")
      .populate("admins", "name email profilePicture")
      .populate("members", "name email profilePicture");

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Only members can access group details
    const isMember = group.members.some(
      (member) => String(member._id) === String(userId),
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    return res.status(200).json({
      success: true,
      group,
    });
  } catch (error) {
    console.error("Get group error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch group",
      error: error.message,
    });
  }
};

// Add members to a group
export const addMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { members } = req.body;

    const userId = req.user.userId || req.user.id || req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide members to add",
      });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Check admin
    const isAdmin = group.admins.some(
      (admin) => String(admin) === String(userId),
    );

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only group admins can add members",
      });
    }

    // Verify users exist
    const uniqueMembers = [...new Set(members.map(String))];

    const existingUsers = await User.find({
      _id: { $in: uniqueMembers },
    }).select("_id");

    if (existingUsers.length !== uniqueMembers.length) {
      return res.status(400).json({
        success: false,
        message: "One or more users do not exist",
      });
    }

    // Add only users who aren't already members
    const currentMembers = group.members.map((member) => String(member));

    const newMembers = uniqueMembers.filter(
      (member) => !currentMembers.includes(member),
    );

    if (newMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All selected users are already members",
      });
    }

    group.members.push(...newMembers);

    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("createdBy", "name email profilePicture")
      .populate("admins", "name email profilePicture")
      .populate("members", "name email profilePicture");

    return res.status(200).json({
      success: true,
      message: "Members added successfully",
      group: updatedGroup,
    });
  } catch (error) {
    console.error("Add members error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add members",
      error: error.message,
    });
  }
};

// Remove member from group
export const removeMember = async (req, res) => {
  try {
    const { groupId, userId: memberId } = req.params;

    const userId = req.user.userId || req.user.id || req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Check admin
    const isAdmin = group.admins.some(
      (admin) => String(admin) === String(userId),
    );

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only group admins can remove members",
      });
    }

    // Creator cannot be removed
    if (String(group.createdBy) === String(memberId)) {
      return res.status(400).json({
        success: false,
        message: "The group creator cannot be removed",
      });
    }

    const isMember = group.members.some(
      (member) => String(member) === String(memberId),
    );

    if (!isMember) {
      return res.status(404).json({
        success: false,
        message: "User is not a member of this group",
      });
    }

    group.members = group.members.filter(
      (member) => String(member) !== String(memberId),
    );

    // Also remove from admins if applicable
    group.admins = group.admins.filter(
      (admin) => String(admin) !== String(memberId),
    );

    await group.save();

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove member error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove member",
      error: error.message,
    });
  }
};

// Leave group
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const userId = req.user.userId || req.user.id || req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Creator cannot leave directly
    if (String(group.createdBy) === String(userId)) {
      return res.status(400).json({
        success: false,
        message:
          "Group creator cannot leave the group. Delete the group instead.",
      });
    }

    const isMember = group.members.some(
      (member) => String(member) === String(userId),
    );

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    group.members = group.members.filter(
      (member) => String(member) !== String(userId),
    );

    group.admins = group.admins.filter(
      (admin) => String(admin) !== String(userId),
    );

    await group.save();

    return res.status(200).json({
      success: true,
      message: "You left the group successfully",
    });
  } catch (error) {
    console.error("Leave group error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to leave group",
      error: error.message,
    });
  }
};

// Delete group
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const userId = req.user.userId || req.user.id || req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Only creator can delete the group
    if (String(group.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Only the group creator can delete the group",
      });
    }

    await Group.findByIdAndDelete(groupId);

    return res.status(200).json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    console.error("Delete group error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete group",
      error: error.message,
    });
  }
};
