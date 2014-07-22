module.exports = function(grunt) {

    // Project configuration.
    grunt
            .initConfig({
                pkg : grunt.file.readJSON('package.json'),
                mochaTest : {
                    test : {
                        options : {
                            reporter : 'spec',
                            timeout : 15000
                        },
                        src : [ 'test/**/Test*.js' ]
                    }
                },
                jshint : {
                    files : [ 'gruntfile.js', 'api/**/*.js', 'test/**/*.js',
                            'app/*.js' ],
                    // configure JSHint (documented at
                    // http://www.jshint.com/docs/)
                    options : {
                        // more options here if you want to override JSHint
                        // defaults
                        globals : {
                            console : true,
                            module : true,
                            require : true
                        }
                    }
                }
            });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');

    // this would be run by typing "grunt test" on the command line
    grunt.registerTask('test', [ 'jshint', 'mochaTest' ]);

    // Default task(s).
    // the default task can be run just by typing "grunt" on the command line
    grunt.registerTask('default', [ 'jshint', 'mochaTest' ]);
}