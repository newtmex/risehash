module.exports = {
  apps : [{
    name: 'risehash_app',
    script: './dist/app.js',

    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    autorestart: true,
    watch: true,
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],

  deploy : {
    production : {
      user : 'rise',
      host : '104.207.130.86',
      ref  : 'origin/master',
      repo : 'git@github.com:newtmex/risehash.git',
      path : '/home/rise/risehash',
      'post-deploy' : 'npm install && npm run build'
    }
  }
};
