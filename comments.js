// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

// Create express app
const app = express();
// Use body parser middleware
app.use(bodyParser.json());
// Use CORS middleware
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Create endpoint to get all comments by post id
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create endpoint to create a new comment
app.post('/posts/:id/comments', async (req, res) => {
  // Generate random id for comment
  const commentId = randomBytes(4).toString('hex');
  // Get content from body
  const { content } = req.body;
  // Get comments for specific post
  const comments = commentsByPostId[req.params.id] || [];
  // Create new comment
  const newComment = { id: commentId, content, status: 'pending' };
  // Add new comment to comments
  comments.push(newComment);
  // Add comments to commentsByPostId
  commentsByPostId[req.params.id] = comments;
  // Send event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { ...newComment, postId: req.params.id },
  });
  // Send response
  res.status(201).send(comments);
});

// Create endpoint to receive events from event bus
app.post('/events', async (req, res) => {
  // Get event type and data
  const { type, data } = req.body;
  // Check if event is comment moderation
  if (type === 'CommentModerated') {
    // Get comments for specific post
    const comments = commentsByPostId[data.postId];
    // Find comment in comments
    const comment = comments.find((comment) => comment.id === data.id);
    // Update status
    comment.status = data.status;
    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data,
    });
  }
  // Send response