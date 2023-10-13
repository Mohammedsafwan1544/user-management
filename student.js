const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cron = require('cron');
const mongoose = require('mongoose');

const web = express();
web.use(bodyParser.json());

const serverPort = process.env.serverPort || 4000;

const adminEmail = 'admin@admin.com';
const adminPassword = 'admin';
const adminSecretKey = 'adminSecret123';
const studentSecretKey = 'studentSecret123';

mongoose.connect('mongodb+srv://mohammedsafwan1544:safwan1544@cluster0.i46iqu1.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true });
const dbConnection = mongoose.connection;

const userSchema = new mongoose.Schema({
         fullName: String,
         userEmail: String,
         userPassword: String,
         userDepartment: String,
});

const taskSchema = new mongoose.Schema({
         userEmail: String,
         taskDescription: String,
         dueTime: Date,
         taskStatus: String,
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

web.post('/admin', (req, res) => {
  const { email, password } = req.body;
  if (email === adminEmail && password === adminPassword) {
    const token = jwt.sign({ email }, adminSecretKey, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

web.post('/user', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ userEmail: email, userPassword: password });

    if (user) {
      const token = jwt.sign({ email }, studentSecretKey, { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Authentication error' });
  }
});

function verifyAdminToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  jwt.verify(token, adminSecretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.adminEmail = decoded.email;
    next();
  });
}

function verifyUserToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  jwt.verify(token, studentSecretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.userEmail = decoded.email;
    next();
  });
}

web.post('/admin/add-user', verifyAdminToken, async (req, res) => {
  const { fullName, email, password, department } = req.body;
  const user = new User({ fullName, userEmail: email, userPassword: password, userDepartment: department });

  try {
    await user.save();
    res.json({ message: 'User added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding the user' });
  }
});

web.post('/admin/assign-task', verifyAdminToken, async (req, res) => {
  const { userEmail, taskDescription, dueTime } = req.body;
  const newTask = new Task({ userEmail, taskDescription, dueTime, taskStatus: 'pending' });

  try {
    await newTask.save();
    res.json({ message: 'Task assigned successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error assigning the task' });
  }
});

web.get('/user/tasks', verifyUserToken, async (req, res) => {
  try {
    const tasks = await Task.find({ userEmail: req.userEmail });
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving tasks' });
  }
});

web.put('/user/done/:taskId', verifyUserToken, async (req, res) => {
  const taskId = req.params.taskId;

  try {
    const updatedTask = await Task.findByIdAndUpdate(taskId, { taskStatus: 'completed' }, { new: true });
    if (updatedTask) {
      res.json({ message: 'Task marked as done' });
    } else {
      res.status(404).json({ message: 'Task not found or already completed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error marking the task as done' });
  }
});

web.listen(serverPort, () => {
  console.log(`Server is running on port ${serverPort}`);
});
