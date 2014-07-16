var Mosaic = require('mosaic-commons');
require('mosaic-teleport');
require('./Mosaic.BO');
require('./Mosaic.BO.Api');
var _ = require('underscore');

/** This class implements methods allowing to register the API on the server. */
Mosaic.BO.Server = Mosaic.Class.extend({

    /** Initializes this class */
    initialize : function(options) {
        this.setOptions(options);
    },

    /** Register an API endpoint in the specified application. */
    registerIn : function(app) {
        var api = new Mosaic.BO.Api();
        var path = this.options.path || '/api';
        var stub = new Mosaic.ApiDescriptor.HttpServerStub({
            path : path,
            instance : api,
            beginHttpCall : function(params) {
                var sessionId = params.req.get('x-session-id') || // HTTP
                // headers
                (params.res.cookies || {})['x-session-id']; // Cookies
                if (sessionId) {
                    // Put the content of the session ID in the query;
                    // So this value became available to API instance methods.
                    params.req.query.sessionId = sessionId;
                }
            },
            endHttpCall : function(params) {
                var sessionId = params.result ? params.result.sessionId : null;
                if (sessionId) {
                    params.res.set('x-session-id', sessionId); // HTTP headers
                    params.res.cookie('x-session-id', sessionId); // Cookies
                    delete params.result.sessionId;
                }
            },
        });
        stub.registerIn(app);
    }
});
