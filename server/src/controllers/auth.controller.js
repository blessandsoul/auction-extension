const userService = require('../services/user.service');
const otpService = require('../services/otp.service');

/**
 * Handle login request
 */
async function login(request, reply) {
  const { username, userInfo } = request.body;

  try {
    // Check if user exists
    const user = await userService.findUserByUsername(username);
    
    if (!user) {
      return reply.code(401).send({ 
        success: false, 
        message: 'Unknown username' 
      });
    }

    // Create and send OTP
    await otpService.createOTP(username, userInfo || {});

    return { 
      success: true, 
      message: 'Password sent to Telegram' 
    };

  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ 
      success: false, 
      error: 'Database error' 
    });
  }
}

/**
 * Handle OTP verification
 */
async function verify(request, reply) {
  const { code } = request.body;
  
  const result = otpService.verifyOTP(code);

  if (!result.valid) {
    const message = result.reason === 'expired' 
      ? 'Password expired' 
      : 'Invalid password';
    
    return reply.code(401).send({ 
      success: false, 
      message 
    });
  }

  // Success - create session
  const sessionExpiry = Date.now() + (4 * 60 * 60 * 1000); // 4 hours
  
  return {
    success: true,
    session: {
      username: result.username,
      expiry: sessionExpiry,
      authenticated: true,
      loginTime: Date.now()
    }
  };
}

module.exports = {
  login,
  verify,
  register
};

/**
 * Handle user registration (Admin only - logical check pending)
 */
async function register(request, reply) {
  const { username, role } = request.body;

  if (!username) {
    return reply.code(400).send({
      success: false,
      message: 'Username is required'
    });
  }

  try {
    // Check if user already exists
    const existingUser = await userService.findUserByUsername(username);
    if (existingUser) {
      return reply.code(409).send({
        success: false,
        message: 'Username already exists'
      });
    }

    // Create user
    const newUser = await userService.createUser(username, role || 'user');

    return {
      success: true,
      message: 'User registered successfully',
      user: newUser
    };

  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      success: false,
      error: 'Database error'
    });
  }
}
