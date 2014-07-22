var expect = require('expect.js');
var Mosaic = require('mosaic-commons');
require('../api/Mosaic.BO.Api');
require('../api/Mosaic.BO.Server');

var _ = require('underscore');
var Utils = require('./Utils');

describe('Remote API', function() {
    it('should be able to login/logout using a remote API instance', function(
        done) {
        withApi(function(api) {
            expect(!!api).to.eql(true);
            return api.login({
                username : 'admin',
                password : 'admin'
            }).then(function(info) {
                expect(!!info).to.eql(true);
                expect(!!info.user).to.eql(true);
                expect(info.user.name).to.eql('admin');
                return api.logout().then(function(info) {
                    expect(!!info).to.eql(true);
                    expect(_.has(info, 'sessionId')).to.eql(true);
                    expect(info.sessionId).to.eql(null);
                });
            });
        }).then(done, done).done();
    });

    it('should be able to create/delete a new project', function(done) {
        withSession(function(api) {
            var project;
            return cleanProject(api, 'test').then(function() {
                return api.createProject({
                    projectKey : 'test'
                });
            }).then(function(p) {
                project = p;
                expect(!!project).to.eql(true);
            }).then(function() {
                return api.deleteProject({
                    projectKey : 'test'
                }).then(function(result) {
                    expect(!!result).to.eql(true);
                });
            }).then(function() {
            });
        }).then(done, done).done();
    });

    it('should be able to create/delete resource in a project', function(done) {
        var projectKey = 'test';
        withProject(projectKey, function(api) {
            return api.createResource({
                projectKey : projectKey,
                resource : {
                    properties : {
                        label : 'My new resource',
                        description : 'A short resource description'
                    }
                }
            }).then(function(resource) {
                expect(!!resource).to.eql(true);
                expect(!!resource.properties).to.eql(true);
                expect(resource.properties).to.eql({
                    label : 'My new resource',
                    description : 'A short resource description'
                });
                return api.saveResource({
                    projectKey : projectKey,
                    resourceId : resource.id,
                    resource : {
                        properties : {
                            label : 'New resource label',
                            description : 'A new short description'
                        }
                    }
                }).then(function(resource) {
                    expect(!!resource).to.eql(true);
                    expect(resource.properties).to.eql({
                        label : 'New resource label',
                        description : 'A new short description'
                    });
                    return api.loadResource({
                        projectKey : projectKey,
                        resourceId : resource.id,
                    }).then(function(resource) {
                        expect(!!resource).to.eql(true);
                        expect(resource.properties).to.eql({
                            label : 'New resource label',
                            description : 'A new short description'
                        });
                    });
                });
            });
            // });
        }).then(done, done).done();
    });

    it('should be able to create/load list of project resourecs',
            function(done) {
                var projectKey = 'test';
                var count = 20;
                withProject(projectKey, function(api) {
                    var promises = [];
                    for (var i = 0; i < count; i++) {
                        var suffix = '' + i;
                        while (suffix.length < 3) {
                            suffix = '0' + suffix;
                        }
                        var promise = api.createResource({
                            projectKey : projectKey,
                            resource : {
                                properties : {
                                    label : 'My new resource ' + suffix,
                                    description : 'A short resource ' + // 
                                    'description ' + suffix
                                }
                            }
                        });
                        promises.push(promise);
                    }
                    return Mosaic.P.all(promises).then(function(resources) {
                        expect(!!resources).to.eql(true);
                        expect(resources.length).to.eql(count);
                        resources.sort(function(first, second) {
                            var a = first.properties.label;
                            var b = second.properties.label;
                            return a > b ? 1 : a < b ? -1 : 0;
                        });
                        return api.loadResources({
                            projectKey : projectKey,
                            orderBy : 'properties.label'
                        }).then(function(list) {
                            expect(!!list).to.eql(true);
                            expect(list.length).to.eql(count);
                            for (var i = 0; i < resources.length; i++) {
                                var resource = resources[i];
                                var test = list[i];
                                expect(resource.properties)// 
                                .to.eql(test.properties);
                            }
                        });
                    }).then(function() {
                        return api.loadResources({
                            projectKey : projectKey,
                            query : {
                                'properties.label' : 'My new resource 003'
                            }
                        }).then(function(list) {
                            // console.log('LIST', list);
                        });
                    });
                }).then(done, done).done();
            });
});

function cleanProject(api, name) {
    var none = function() {
    };
    return api.deleteProject({
        projectKey : name
    }).then(none, none);
}

function withProject(projectKey, callback) {
    return withSession(function(api) {
        return Mosaic.P.fin(cleanProject(api, projectKey).then(function() {
            return api.createProject({
                projectKey : projectKey
            });
        }).then(function(p) {
            return callback(api);
        }), function() {
            return cleanProject(api, projectKey);
        });
    });
}

function withSession(callback) {
    return withApi(function(api) {
        expect(!!api).to.eql(true);
        return api.login({
            username : 'admin',
            password : 'admin'
        }).then(function(info) {
            expect(!!info).to.eql(true);
            expect(!!info.user).to.eql(true);
            expect(info.user.name).to.eql('admin');
            return callback(api);
        });
    });
}

function withApi(callback) {
    return Mosaic.P.then(function() {
        // This test don't keep session ID explicitly. The session ID
        // transferred back and forth in the 'x-session-id' HTTP header.
        var options = {
            path : '/toto'
        };
        var appCode = '1234567890';
        var serverOptions = _.extend({}, options, {
            baseUrl : 'http://localhost:9000',
            appCode : appCode
        });
        return Utils.withServer(function(app) {
            var serverStub = new Mosaic.BO.Server(serverOptions);
            serverStub.registerIn(app);
            return options;
        }, function test(server) {
            var baseUrl = Utils.getBaseUrl(options);
            var api;
            var clientOptions = _.extend({}, options, {
                baseUrl : baseUrl,
                beginHttpCall : function(params) {
                    // Get the session ID from the stub object and set this
                    // value in the HTTP header to send it to the server.
                    var sessionId = params.stub.sessionId;
                    if (sessionId) {
                        params.req.headers['x-session-id'] = sessionId;
                    }
                },
                endHttpCall : function(params) {
                    // Load the session ID from headers and save it as a field
                    // in the stub.
                    var sessionId = params.res.headers['x-session-id'];
                    if (sessionId) {
                        params.stub.sessionId = sessionId;
                    }
                },
            });
            return Mosaic.ApiDescriptor.HttpClientStub.load(clientOptions)
                    .then(callback);
        });
    });
}
