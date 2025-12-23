module.exports = {
  apps: [{
    name: 'aas-server',
    script: './src/server.js',
    
    // CLUSTER MODE - Run on 1 core only
    instances: 1,           // Run exactly 1 instance (1 core)
    exec_mode: 'cluster',   // Enable cluster mode for better performance
    
    // Process management
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true,
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Restart policy
    exp_backoff_restart_delay: 100,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
