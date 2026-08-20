import express from 'express';

import {
  createGroup,
  getMyGroups,
  getGroupById,
  addMembers,
  removeMember,
  leaveGroup,
  deleteGroup
} from '../controllers/groupController.js';

import authMiddleware from '../middleware/userAuth.js';

const router = express.Router();

// Create a new group
router.post('/', authMiddleware, createGroup);

// Get all groups of the logged-in user
router.get('/', authMiddleware, getMyGroups);

// Get a specific group
router.get('/:groupId', authMiddleware, getGroupById);

// Add members to a group
router.post('/:groupId/members', authMiddleware, addMembers);

// Remove a member from a group
router.delete(
  '/:groupId/members/:userId',
  authMiddleware,
  removeMember
);

// Leave a group
router.post('/:groupId/leave', authMiddleware, leaveGroup);

// Delete a group
router.delete('/:groupId', authMiddleware, deleteGroup);

export default router;