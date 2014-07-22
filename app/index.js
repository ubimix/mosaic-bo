(function($wnd, require, define) {
    'use strict';
    require.config({
        paths : {
            'underscore' : 'libs/underscore/underscore',
            'jquery' : 'libs/jquery/dist/jquery',
            'jquery-cookie' : 'libs/jquery-cookie/jquery.cookie',
            'superagent' : 'libs/superagent/superagent',
            'mosaic-commons' : 'libs/mosaic-commons/dist/mosaic-commons',
            'mosaic-teleport' : 'libs/mosaic-teleport/dist/mosaic-teleport',
        },
        shim : {
            'underscore' : {
                exports : '_'
            },
            'jquery-cookie' : {
                deps : [ 'jquery' ]
            },
            'mosaic-commons' : {
                deps : [ 'underscore' ]
            },
            'mosaic-teleport' : {
                deps : [ 'underscore', 'superagent', 'mosaic-commons' ]
            }
        }
    });

    var dependencies = [ 'jquery', 'jquery-cookie', 'mosaic-commons',
            'mosaic-teleport' ];
    require(dependencies, function() {
        var Mosaic = require('mosaic-commons');
        var $ = require('jquery');
        var baseUrl = '../api';

        var api;
        Mosaic.ApiDescriptor.HttpClientStub.load({
            baseUrl : baseUrl,
            beginHttpCall : function(params) {
                var sessionId = params.stub.sessionId;
                if (sessionId) {
                    params.req.headers['x-session-id'] = sessionId;
                }
            },
            endHttpCall : function(params) {
                // Load the session ID from headers and save it as a field in
                // the stub.
                var sessionId = params.res.headers['x-session-id'];
                if (sessionId) {
                    params.stub.sessionId = sessionId;
                }
            },
        })//
        .then(function(result) {
            api = result;
            return login();
        }).then(function() {
            return runApp();
        }).then(null, function(err) {
            console.log('Error', err);
            console.log('Redirect to the first page...');
        }).done();

        function runApp() {
            return Mosaic.P.then(function() {
                var projectInfo = {
                    name : 'My project',
                    description : 'New description'
                };
                setMessage('Try to create a new project. ' + //
                JSON.stringify(projectInfo));
                return api.createProject(projectInfo).then(function(project) {
                    setMessage('A new project was successfully created. ' + // 
                    JSON.stringify(project));
                }).then(function() {
                    return api.loadProjects().then(function(projects) {
                        setMessage('Full list of projects: ' + // 
                        JSON.stringify(projects));
                    });
                });
            });
        }

        function setMessage(msg) {
            $('<p/>').text(msg).appendTo('body');
        }

        function login() {
            function doLogin() {
                return Mosaic.P.then(function() {
                    var login = prompt('Login:', 'John');
                    var password = prompt('Password:', 'Smith');
                    return api.login({
                        login : login,
                        password : password
                    });
                })
                //
                .then(function(info) {
                    console.log('You are logged in!', info);
                    return info;
                }, function(err) {
                    if (confirm('You are logged out.\n' + //
                    'Do you want to log in?')) {
                        return doLogin();
                    } else {
                        throw Mosaic.Errors.newError('You are not logged in.');
                    }
                });
            }
            return Mosaic.P.then(function() {
                return api.userInfo();
            }).then(null, function() {
                return doLogin();
            });
        }
    });
})(window, require, define);
