var Mosaic = module.exports = require('mosaic-commons');
require('./Mosaic.BO');
var _ = require('underscore');

/**
 * This utility function "annotates" the specified object methods by the
 * corresponding REST paths and HTTP methods.
 */
function rest(path, http, method) {
    method.http = http;
    method.path = path;
    return method;
}

/** Backoffice API. It has no dependencies on Express or other frameworks. */
Mosaic.BO.Api = Mosaic.Class.extend({
    SESSION_ID : '124',
    USER_INFO : {
        firstName : 'John',
        lastName : 'Smith',
        age : 33,
        login : 'John',
        password : 'Smith'
    },

    /** Initializes this object and creates an empty index of projects. */
    initialize : function(options) {
        this.options = options || {};
        this.projects = {};
    },

    // ------------------------------------------------------------------------
    // Authentication management

    /**
     * Checks login/password pair and return an error if there is no such
     * credentials. This method accepts only this login/password pair:
     * login:'John', password:'Smith'.
     */
    login : rest('/auth/login', 'post', function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = params || {};
            if (params.login !== that.USER_INFO.login || // 
            params.password !== that.USER_INFO.password) {
                that.throwError(401, 'Bad credentials');
            }
            // Creates and returns a new session identifier.
            return {
                sessionId : that.SESSION_ID,
                user : that.USER_INFO
            };
        });
    }),

    /**
     * Log-out the currently logged user. Fails if the user is not logged in.
     */
    logout : rest('/auth/logout', 'post', function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = that._checkSession(params);
            return {
                sessionId : '', // Set an empty session ID
                msg : 'You are logged out.'
            };
        });
    }),

    /**
     * Returns information about the logged user.
     */
    userInfo : rest('/auth/info', 'get', function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = that._checkSession(params);
            return that.USER_INFO;
        });
    }),

    // ------------------------------------------------------------------------
    // Project management

    /** Creates and returns a new project with the specified name */
    createProject : rest('/project', 'post', function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = that._checkSession(params);
            // TODO: Check access rights for modifications
            var projectName = params.name;
            if (!projectName) {
                that.throwError(501, 'Project name is not defined');
            }
            var description = params.description || '';
            var project = {
                id : _.uniqueId('project-'),
                name : projectName,
                description : description,
            };
            that.projects[project.id] = project;
            return project;
        });
    }),

    /** Returns a list of all projects. */
    loadProjects : rest('/projects', 'get', function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = that._checkSession(params);
            var list = _.values(that.projects);
            list = _.sortBy(list, function(a, b) {
                return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
            });
            return list;
        });
    }),

    /**
     * Returns information about a project corresponding to the specified
     * identifier.
     */
    loadProject : rest('/project/:id', 'get', function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            params = that._checkSession(params);
            var projectId = params.id;
            if (!projectId) {
                that.throwError(501, 'Project identifier is not defined');
            }
            var project = that.projects[projectId];
            if (!project) {
                that.throwError(404, 'Project with ' + //
                'the specified identifier ' + //
                'was not found. ID: ' + projectId);
            }
            return project;
        });
    }),

    /** Saves an existing project with new parameters. */
    saveProject : rest('/project/:id', 'post', function(params) {
        var that = this;
        return Mosaic.P.then(function() {
            // TODO: Check access rights for modifications
            return that.loadProject(params).then(function(project) {
                project.name = params.name;
                project.description = params.description;
                return project;
            });
        });
    }),

    // ------------------------------------------------------------------------
    // Utility methods

    /** Throws an exception with the specified code and message. */
    throwError : function(code, msg) {
        var err = Mosaic.Errors.newError(msg).code(code);
        throw err;
    },

    /** An utility method used to centralize session verification. */
    _checkSession : function(params) {
        var that = this;
        params = params || {};
        if (params.sessionId != that.SESSION_ID) {
            that.throwError(403, 'Forbidden');
        }
        return params;
    }
});
