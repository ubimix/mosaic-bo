var Mosaic = module.exports = require('mosaic-commons');
require('./Mosaic.BO');
var _ = require('underscore');

/** Backoffice API. It has no dependencies on Express or other frameworks. */
Mosaic.BO.Api = Mosaic.Class.extend({

    /** Initializes this object. */
    initialize : function(options) {
        this.setOptions(options);
        if (!this.options.baseUrl) {
            throw Mosaic.Errors
                    .newError('URL of a BaasBox endpoint is not defined.');
        }
        if (!this.options.appCode) {
            throw Mosaic.Errors.newError('APP code is not defined');
        }
        this.client = new Mosaic.HttpClient.Superagent(merge(this.options, {
            formEncoded : true
        }));
    },

    // ------------------------------------------------------------------------
    // Authentication management

    /**
     * Checks login/password pair and return an error if there is no such
     * credentials.
     */
    login : function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = that._checkParams(params);
            return that._call({
                path : '/login',
                method : 'POST',
                body : {
                    username : params.username,
                    password : params.password,
                    appcode : that.options.appCode
                }
            }).then(function(res) {
                var sessionId = res.data['X-BB-SESSION'];
                var user = res.data.user;
                var roles = user.roles;
                return {
                    sessionId : sessionId,
                    user : user,
                    roles : roles
                };
            });
        });
    },

    /**
     * Log-out the currently logged user. Fails if the user is not logged in.
     */
    logout : function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = that._checkSession(params);
            return that._call({
                path : '/logout',
                method : 'POST',
                headers : params.headers
            }).then(function(res) {
                return {
                    sessionId : null
                };
            });
        });
    },

    // ------------------------------------------------------------------------
    // Project management

    /**
     * Creates and returns a new project corresponding to the specified project
     * key.
     */
    createProject : function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = that._checkSession(params);
            that._checkProjectKey(params);
            return that._call({
                path : '/admin/collection/' + params.projectKey,
                method : 'POST',
                headers : params.headers
            });
        });
    },

    /** Deletes a project with the specified key. */
    deleteProject : function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = that._checkSession(params);
            that._checkProjectKey(params);
            return that._call({
                path : '/admin/collection/' + params.projectKey,
                method : 'DELETE',
                headers : params.headers
            });
        });
    },

    // ------------------------------------------------------------------------
    // Resource management

    /**
     * Creates and returns a new project corresponding to the specified project
     * key an project name.
     */
    createResource : function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = that._checkSession(params, {
                headers : {
                    'Content-Type' : 'application/json'
                }
            });
            that._checkProjectKey(params);
            that._checkResource(params);
            return that._call({
                path : '/document/' + params.projectKey,
                method : 'POST',
                headers : params.headers,
                body : params.resource
            }).then(function(res) {
                return res.data;
            });
        });
    },

    /**
     * Saves an already existing resource corresponding to the specified project
     * key and a resource identifier.
     * 
     * @param params.projectKey
     *            identifier of the project where resource should be updated
     * @param params.resourceId
     *            identifier of the resource to update
     * @param params.resource
     *            the resource containing fields to save
     * @param params.replace
     *            if this flag is <code>true</code> then only individual
     *            fields defined in the <code>resource</code> will be replaced
     */
    saveResource : function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = that._checkSession(params, {
                headers : {
                    'Content-Type' : 'application/json'
                }
            });
            that._checkProjectKey(params);
            that._checkResourceId(params);
            that._checkResource(params);
            var path = '/document/' + params.projectKey + //
            '/' + params.resourceId;
            if (params.replace === false) {
                var promises = [];
                _.each(params.resource, function(value, field) {
                    var fullPath = path + '/.' + field;
                    var promise = that._call({
                        path : fullPath,
                        method : 'PUT',
                        headers : params.headers,
                        body : {
                            data : value
                        }
                    });
                    promises.push(promise);
                });
                return Mosaic.P.all(promises).then(function(res) {
                    return that.loadResource(params);
                });
            } else {
                return that._call({
                    path : path,
                    method : 'PUT',
                    headers : params.headers,
                    body : params.resource
                }).then(function(res) {
                    return res.data;
                });
            }
        });
    },

    /**
     * Loads an already existing resource corresponding to the specified project
     * key and a resource identifier.
     */
    loadResource : function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = that._checkSession(params, {});
            that._checkProjectKey(params);
            that._checkResourceId(params);
            return that._call({
                path : '/document/' + params.projectKey + //
                '/' + params.resourceId,
                method : 'GET',
                headers : params.headers
            })//
            .then(function(res) {
                return res.data;
            });
        });
    },

    /**
     * Loads and returns a resource for the specified project and resource
     * identifier.
     */
    deleteResource : function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = that._checkSession(params);
            that._checkProjectKey(params);
            return that._call({
                path : '/document/' + params.projectKey + //
                '/' + params.resourceId,
                method : 'DELETE',
                headers : params.headers
            });
        });
    },

    /** Queries documents of a project using the specified queries parameters. */
    loadResources : function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = that._checkSession(params);
            var query = params.query = params.query || {};
            // Number of records per page
            var recordsPerPage = params.recordsPerPage || 100;
            query.recordsPerPage = recordsPerPage;
            // Sorting order
            var orderBy = params.orderBy;
            if (!orderBy) {
                orderBy = 'properties.label';
            }
            query.orderBy = orderBy;
            return that._call({
                path : '/document/' + params.projectKey,
                method : 'GET',
                query : query,
                headers : params.headers
            }).then(function(res) {
                return res.data;
            });
        });
    },

    // ------------------------------------------------------------------------
    // Utility methods

    /** Throws an exception with the specified code and message. */
    throwError : function(code, msg) {
        var err = Mosaic.Errors.newError(msg).code(code);
        throw err;
    },

    /** Checks project key identifier */
    _checkProjectKey : function(params) {
        if (!_.isString(params.projectKey)) {
            throw Mosaic.Errors.newError('Project key is not defined')
                    .code(400);
        }
    },
    /** Checks the resource identifier */
    _checkResourceId : function(params) {
        if (!_.isString(params.resourceId)) {
            throw Mosaic.Errors.newError('Resource identifier is not defined')
                    .code(400);
        }
    },
    /** Checks if a resource is properly defined in the specified parameters. */
    _checkResource : function(params) {
        if (!_.isObject(params.resource)) {
            throw Mosaic.Errors.newError('Resource is not defined')//
            .code(400);
        }
    },

    /** An utility method used to centralize session verification. */
    _checkSession : function(params, options) {
        var that = this;
        params = that._checkParams(params);
        var sessionId = params.sessionId;
        delete params.sessionId;
        if (!sessionId || sessionId === '') {
            that.throwError(403, 'Forbidden');
        }
        params = merge({}, params, {
            headers : {
                'X-BAASBOX-APPCODE' : that.options.appCode,
                'X-BB-SESSION' : sessionId
            }
        }, options);
        return params;
    },

    _checkParams : function(params) {
        return merge.apply(this, arguments);
    },

    _call : function(options) {
        var that = this;
        return Mosaic.P.then(function() {
            var Request = require('superagent');
            var defer = Mosaic.P.defer();
            var url = that.options.baseUrl + options.path;
            var method = (options.method || 'get').toLowerCase();
            if (method == 'delete')
                method = 'del';
            var f = Request[method](url).type('form');
            if (options.query) {
                f.query(options.query);
            }
            if (options.headers) {
                f.set(options.headers);
            }
            if (options.body) {
                f.send(options.body);
            }
            f.end(function(err, r) {
                var res = {
                    status : 200,
                    headers : {}
                };
                try {
                    if (r) {
                        res.status = r.status;
                        _.extend(res.headers, r.headers || {});
                        res.data = r.body ? r.body.data : undefined;
                    } else if (err && err.status) {
                        res.status = err.status;
                    } else {
                        res.status = 500;
                    }
                    if (err) {
                        defer.reject(err);
                    } else {
                        defer.resolve(res);
                    }
                } catch (e) {
                    defer.reject(e);
                }
            });
            return defer.promise;
        });
    },

    _call1 : function(options) {
        var that = this;
        return Mosaic.P.then(function() {
            // console.log('* [_call]', options);
            options.headers = _.extend({}, options.headers,
                    that.options.headers);
            var req = that.client.newRequest(options);
            var res = that.client.newResponse(req);
            return that.client.handle(req, res).then(function(result) {
                // console.log(' -> [_call]', result);
                return result;
            });
        });
    }
});

/** Deeply merges fields from all specified objects. */
function merge() {
    var result = {};
    _.each(arguments, function(obj) {
        if (!obj)
            return;
        _.each(obj, function(val, key) {
            var oldValue = result[key];
            if (_.isObject(oldValue) && _.isObject(val)) {
                val = merge(oldValue, val);
            }
            result[key] = val;
        });
    });
    return result;
}
