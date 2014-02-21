require('./Consoloid/Server/Webserver');

var options = {
    env: process.argv[2]
}

new Consoloid.Server.Webserver(options).run();