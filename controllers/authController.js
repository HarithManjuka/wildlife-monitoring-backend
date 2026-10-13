// backend/controllers/authController.js

// Hardcoded users for the team members
const mockUsers = [
  {
    email: 'harith@gmail.com',
    password: 'Harith123',
    userId: 'USR-8821',
    name: 'A.M.H.M. Abeykoon',
    role: 'LIAISON_OFFICER',
    department: 'Wildlife Operations'
  },
  {
    email: 'malith@gmail.com',
    password: 'Malith123',
    userId: 'USR-8822',
    name: 'M.U. Handaragama',
    role: 'RANGER',
    department: 'Field Patrol'
  },
  {
    email: 'sandeepa@gmail.com',
    password: 'Sandeepa123',
    userId: 'USR-8823',
    name: 'K.M.S.G.S.C. Karunanayake',
    role: 'SENSOR_DISPATCHER',
    department: 'Wildlife Operations'
  },
  {
    email: 'shaini@gmail.com',
    password: 'Shaini123',
    userId: 'USR-8824',
    name: 'J.R.I.C.S. Jayakody',
    role: 'PARK_MANAGER',
    department: 'Conservation Management'
  }
];

exports.login = (req, res) => {
  const { email, password } = req.body;

  const user = mockUsers.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  // Generate a mock token (Base64 encoding the user object for simplicity)
  // In a real app, you would use jwt.sign() here.
  const mockToken = Buffer.from(JSON.stringify(user)).toString('base64');

  res.status(200).json({
    success: true,
    message: `Welcome back, ${user.name}`,
    token: mockToken,
    userData: {
      userId: user.userId,
      name: user.name,
      role: user.role,
      department: user.department
    }
  });
};