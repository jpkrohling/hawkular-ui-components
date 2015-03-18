/// Copyright 2014-2015 Red Hat, Inc. and/or its affiliates
/// and other contributors as indicated by the @author tags.
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///   http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.


var HawkularAccounts;
(function (HawkularAccounts) {
    HawkularAccounts.pluginName = "hawkular-accounts";
    HawkularAccounts.log = Logger.get(HawkularAccounts.pluginName);
    HawkularAccounts.templatePath = "plugins/accounts/html";
})(HawkularAccounts || (HawkularAccounts = {}));

var HawkularAccounts;
(function (HawkularAccounts) {
    HawkularAccounts._module = angular.module(HawkularAccounts.pluginName, []);
    var accountsTab = undefined;
    HawkularAccounts._module.config(['$locationProvider', '$routeProvider', 'HawtioNavBuilderProvider', function ($locationProvider, $routeProvider, builder) {
        accountsTab = builder.create().id(HawkularAccounts.pluginName).title(function () { return "Accounts"; }).href(function () { return "/accounts"; }).subPath("My account", "accounts", builder.join(HawkularAccounts.templatePath, 'accounts.html')).subPath("Organizations", "organizations", builder.join(HawkularAccounts.templatePath, 'organizations.html')).build();
        builder.configureRouting($routeProvider, accountsTab);
        $routeProvider.when('/accounts/organizations/new', { templateUrl: builder.join(HawkularAccounts.templatePath, 'organization_new.html') });
        $locationProvider.html5Mode(true);
    }]);
    HawkularAccounts._module.run(['HawtioNav', function (HawtioNav) {
    }]);
    hawtioPluginLoader.addModule(HawkularAccounts.pluginName);
})(HawkularAccounts || (HawkularAccounts = {}));

var HawkularAccounts;
(function (HawkularAccounts) {
    var AuthService = (function () {
        function AuthService($rootScope, $window) {
            var _this = this;
            this.$rootScope = $rootScope;
            this.$window = $window;
            this.onReady(function () {
                _this.$rootScope['username'] = _this.keycloak().idTokenParsed.name;
            });
        }
        AuthService.prototype.keycloak = function () {
            return this.$window['keycloak'];
        };
        AuthService.prototype.onReady = function (callback) {
            var _this = this;
            if (this.$window['keycloakReady'] === true) {
                callback();
            }
            else {
                this.keycloak().onReady = function () {
                    _this.$window['keycloakReady'] = true;
                    callback();
                };
            }
        };
        AuthService.prototype.logout = function () {
            return this.keycloak().logout();
        };
        AuthService.prototype.updateToken = function (periodicity) {
            return this.keycloak().updateToken(periodicity);
        };
        AuthService.prototype.token = function () {
            return this.keycloak().token;
        };
        AuthService.prototype.isAuthenticated = function () {
            return this.keycloak() && this.keycloak().authenticated;
        };
        AuthService.$inject = ['$rootScope', '$window'];
        return AuthService;
    })();
    HawkularAccounts.AuthService = AuthService;
    HawkularAccounts._module.service('Auth', AuthService);
})(HawkularAccounts || (HawkularAccounts = {}));

var HawkularAccounts;
(function (HawkularAccounts) {
    var AuthInterceptorService = (function () {
        function AuthInterceptorService($q, Auth) {
            var _this = this;
            this.$q = $q;
            this.Auth = Auth;
            this.request = function (request) {
                console.debug('Intercepting request');
                var BASE_URL = "http://localhost:8080/hawkular-";
                var addBearer, deferred;
                if (request.url.indexOf(BASE_URL) === -1) {
                    console.debug('The requested URL is not part of the base URL. Base URL: ' + BASE_URL + ', requested URL: ' + request.url);
                    return request;
                }
                addBearer = function () {
                    return _this.Auth.updateToken(5).success(function () {
                        var token = _this.Auth.token();
                        console.debug('Adding bearer token to the request: ' + token);
                        request.headers.Authorization = 'Bearer ' + token;
                        deferred.notify();
                        return deferred.resolve(request);
                    }).error(function () {
                        console.log("Couldn't update token");
                    });
                };
                deferred = _this.$q.defer();
                _this.Auth.onReady(addBearer);
                return _this.$q.when(deferred.promise);
            };
            this.responseError = function (rejection) {
                console.debug('Intercepting error response');
                if (rejection.status === 401) {
                    _this.Auth.logout();
                }
                return _this.$q.reject(rejection);
            };
        }
        AuthInterceptorService.Factory = function ($q, Auth) {
            return new AuthInterceptorService($q, Auth);
        };
        AuthInterceptorService.$inject = ['$q', 'Auth'];
        return AuthInterceptorService;
    })();
    HawkularAccounts.AuthInterceptorService = AuthInterceptorService;
    HawkularAccounts._module.config(function ($httpProvider) {
        console.debug('Adding AuthInterceptor');
        return $httpProvider.interceptors.push(HawkularAccounts.AuthInterceptorService.Factory);
    });
})(HawkularAccounts || (HawkularAccounts = {}));

var HawkularAccounts;
(function (HawkularAccounts) {
    HawkularAccounts.OrganizationsController = HawkularAccounts._module.controller("HawkularAccounts.OrganizationsController", [
        '$scope',
        'HawkularAccounts.OrganizationService',
        '$log',
        '$location',
        function ($scope, OrganizationService, $log, $location) {
            $scope.organizations = [];
            $scope.loading = true;
            $scope.load = function () {
                $log.debug("Trying to load the organizations for this user.");
                $scope.organizations = OrganizationService.query({}, function () {
                    $log.debug("List of organizations retrieved.");
                    $scope.loading = false;
                }, function () {
                    $log.warn("List of organizations could NOT be retrieved.");
                    $scope.loading = false;
                });
            };
            $scope.showCreateForm = function () {
                $location.path('/accounts/organizations/new');
            };
            $scope.remove = function (organization) {
                organization.$remove().then(function () {
                    $log.debug("Organization removed");
                    $scope.organizations.splice($scope.organizations.indexOf(organization), 1);
                });
            };
            $scope.load();
        }
    ]);
    HawkularAccounts.OrganizationNewController = HawkularAccounts._module.controller("HawkularAccounts.OrganizationNewController", [
        '$scope',
        'HawkularAccounts.OrganizationService',
        '$log',
        '$location',
        function ($scope, OrganizationService, $log, $location) {
            $scope.organizationNew = new OrganizationService({});
            $scope.persist = function () {
                $scope.organizationNew.$save({}, function () {
                    $log.debug("Organization added.");
                    $location.path('/accounts/organizations');
                }, function () {
                    $log.debug("Organization could NOT be added.");
                });
                $log.debug("Trying to persist the organization");
            };
        }
    ]);
    HawkularAccounts.OrganizationService = HawkularAccounts._module.service("HawkularAccounts.OrganizationService", ["$resource", function ($resource) {
        return $resource('http://localhost:8080/hawkular-accounts/organizations/:id', { id: '@id' });
    }]);
    HawkularAccounts._module.requires.push("ngResource");
})(HawkularAccounts || (HawkularAccounts = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLmpzIiwiL3Vzci9sb2NhbC9kYXRhL3Byb2plY3RzL2hhd2t1bGFyLXVpLWNvbXBvbmVudHMvYWNjb3VudHMvdHMvYWNjb3VudHNHbG9iYWxzLnRzIiwiL3Vzci9sb2NhbC9kYXRhL3Byb2plY3RzL2hhd2t1bGFyLXVpLWNvbXBvbmVudHMvYWNjb3VudHMvdHMvYWNjb3VudHNQbHVnaW4udHMiLCIvdXNyL2xvY2FsL2RhdGEvcHJvamVjdHMvaGF3a3VsYXItdWktY29tcG9uZW50cy9hY2NvdW50cy90cy9hdXRoLnRzIiwiL3Vzci9sb2NhbC9kYXRhL3Byb2plY3RzL2hhd2t1bGFyLXVpLWNvbXBvbmVudHMvYWNjb3VudHMvdHMvYXV0aEludGVyY2VwdG9yLnRzIiwiL3Vzci9sb2NhbC9kYXRhL3Byb2plY3RzL2hhd2t1bGFyLXVpLWNvbXBvbmVudHMvYWNjb3VudHMvdHMvb3JnYW5pemF0aW9ucy50cyJdLCJuYW1lcyI6WyJIYXdrdWxhckFjY291bnRzIiwiSGF3a3VsYXJBY2NvdW50cy5BdXRoU2VydmljZSIsIkhhd2t1bGFyQWNjb3VudHMuQXV0aFNlcnZpY2UuY29uc3RydWN0b3IiLCJIYXdrdWxhckFjY291bnRzLkF1dGhTZXJ2aWNlLmtleWNsb2FrIiwiSGF3a3VsYXJBY2NvdW50cy5BdXRoU2VydmljZS5vblJlYWR5IiwiSGF3a3VsYXJBY2NvdW50cy5BdXRoU2VydmljZS5sb2dvdXQiLCJIYXdrdWxhckFjY291bnRzLkF1dGhTZXJ2aWNlLnVwZGF0ZVRva2VuIiwiSGF3a3VsYXJBY2NvdW50cy5BdXRoU2VydmljZS50b2tlbiIsIkhhd2t1bGFyQWNjb3VudHMuQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkIiwiSGF3a3VsYXJBY2NvdW50cy5BdXRoSW50ZXJjZXB0b3JTZXJ2aWNlIiwiSGF3a3VsYXJBY2NvdW50cy5BdXRoSW50ZXJjZXB0b3JTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiSGF3a3VsYXJBY2NvdW50cy5BdXRoSW50ZXJj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SUFDOUZBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0lBRUpBLHdCQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtBQUN4Q0EsQ0FBQ0EsRUEvRE0sZ0JBQWdCLEtBQWhCLGdCQUFnQixRQStEdEIiLCJmaWxlIjoiY29tcGlsZWQuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGwsIi8vLyBDb3B5cmlnaHQgMjAxNC0yMDE1IFJlZCBIYXQsIEluYy4gYW5kL29yIGl0cyBhZmZpbGlhdGVzXG4vLy8gYW5kIG90aGVyIGNvbnRyaWJ1dG9ycyBhcyBpbmRpY2F0ZWQgYnkgdGhlIEBhdXRob3IgdGFncy5cbi8vL1xuLy8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8vXG4vLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vL1xuLy8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5tb2R1bGUgSGF3a3VsYXJBY2NvdW50cyB7XG4gICAgZXhwb3J0IHZhciBwbHVnaW5OYW1lID0gXCJoYXdrdWxhci1hY2NvdW50c1wiO1xuICAgIGV4cG9ydCB2YXIgbG9nOkxvZ2dpbmcuTG9nZ2VyID0gTG9nZ2VyLmdldChwbHVnaW5OYW1lKTtcbiAgICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IFwicGx1Z2lucy9hY2NvdW50cy9odG1sXCI7XG59XG4iLCIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImFjY291bnRzR2xvYmFscy50c1wiLz5cbm1vZHVsZSBIYXdrdWxhckFjY291bnRzIHtcbiAgICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShIYXdrdWxhckFjY291bnRzLnBsdWdpbk5hbWUsIFtdKTtcbiAgICB2YXIgYWNjb3VudHNUYWI6YW55ID0gdW5kZWZpbmVkO1xuXG4gICAgX21vZHVsZS5jb25maWcoWyckbG9jYXRpb25Qcm92aWRlcicsICckcm91dGVQcm92aWRlcicsICdIYXd0aW9OYXZCdWlsZGVyUHJvdmlkZXInLCAoJGxvY2F0aW9uUHJvdmlkZXIsICRyb3V0ZVByb3ZpZGVyOm5nLnJvdXRlLklSb3V0ZVByb3ZpZGVyLCBidWlsZGVyOkhhd3Rpb01haW5OYXYuQnVpbGRlckZhY3RvcnkpID0+IHtcbiAgICAgICAgYWNjb3VudHNUYWIgPSBidWlsZGVyLmNyZWF0ZSgpXG4gICAgICAgICAgICAuaWQoSGF3a3VsYXJBY2NvdW50cy5wbHVnaW5OYW1lKVxuICAgICAgICAgICAgLnRpdGxlKCgpID0+IFwiQWNjb3VudHNcIilcbiAgICAgICAgICAgIC5ocmVmKCgpID0+IFwiL2FjY291bnRzXCIpXG4gICAgICAgICAgICAuc3ViUGF0aChcIk15IGFjY291bnRcIiwgXCJhY2NvdW50c1wiLCBidWlsZGVyLmpvaW4oSGF3a3VsYXJBY2NvdW50cy50ZW1wbGF0ZVBhdGgsICdhY2NvdW50cy5odG1sJykpXG4gICAgICAgICAgICAuc3ViUGF0aChcIk9yZ2FuaXphdGlvbnNcIiwgXCJvcmdhbml6YXRpb25zXCIsIGJ1aWxkZXIuam9pbihIYXdrdWxhckFjY291bnRzLnRlbXBsYXRlUGF0aCwgJ29yZ2FuaXphdGlvbnMuaHRtbCcpKVxuICAgICAgICAgICAgLmJ1aWxkKCk7XG4gICAgICAgIGJ1aWxkZXIuY29uZmlndXJlUm91dGluZygkcm91dGVQcm92aWRlciwgYWNjb3VudHNUYWIpO1xuXG4gICAgICAgICRyb3V0ZVByb3ZpZGVyLndoZW4oJy9hY2NvdW50cy9vcmdhbml6YXRpb25zL25ldycsIHt0ZW1wbGF0ZVVybDogYnVpbGRlci5qb2luKEhhd2t1bGFyQWNjb3VudHMudGVtcGxhdGVQYXRoLCAnb3JnYW5pemF0aW9uX25ldy5odG1sJyl9KTtcbiAgICAgICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIH1dKTtcblxuICAgIF9tb2R1bGUucnVuKFsnSGF3dGlvTmF2JywgKEhhd3Rpb05hdjpIYXd0aW9NYWluTmF2LlJlZ2lzdHJ5KSA9PiB7XG4gICAgICAgIC8vSGF3dGlvTmF2LmFkZChhY2NvdW50c1RhYik7XG4gICAgfV0pO1xuXG4gICAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShIYXdrdWxhckFjY291bnRzLnBsdWdpbk5hbWUpO1xufVxuIiwiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJhY2NvdW50c1BsdWdpbi50c1wiLz5cbi8qKlxuICogQXR0ZW50aW9uOiB0aGlzIGNsYXNzIHdpbGwgcHJvYmFibHkgYmUgcmVwbGFjZWQgYnkgdGhlIHByb3BlciBoYXd0LmlvIEtleWNsb2FrIGludGVncmF0aW9uLlxuICogV2hpbGUgaXQncyBub3QgZG9uZSwgd2UgYXJlIGRvaW5nIHRoZSBpbnRlZ3JhdGlvbiBieSBvdXJzZWx2ZXMuXG4gKi9cbm1vZHVsZSBIYXdrdWxhckFjY291bnRzIHtcblxuICAgIGV4cG9ydCBjbGFzcyBBdXRoU2VydmljZSB7XG4gICAgICAgIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHJvb3RTY29wZScsICckd2luZG93J107XG4gICAgICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgJHJvb3RTY29wZTpuZy5JUm9vdFNjb3BlU2VydmljZSwgcHJpdmF0ZSAkd2luZG93Om5nLklXaW5kb3dTZXJ2aWNlKSB7XG4gICAgICAgICAgdGhpcy5vblJlYWR5KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZVsndXNlcm5hbWUnXSA9IHRoaXMua2V5Y2xvYWsoKS5pZFRva2VuUGFyc2VkLm5hbWU7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBwcml2YXRlIGtleWNsb2FrKCk6YW55IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiR3aW5kb3dbJ2tleWNsb2FrJ107XG4gICAgICAgIH1cblxuICAgICAgICBvblJlYWR5KGNhbGxiYWNrKTphbnkge1xuICAgICAgICAgICAgaWYgKHRoaXMuJHdpbmRvd1sna2V5Y2xvYWtSZWFkeSddID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMua2V5Y2xvYWsoKS5vblJlYWR5ID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuJHdpbmRvd1sna2V5Y2xvYWtSZWFkeSddID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbG9nb3V0KCk6dm9pZCB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5rZXljbG9haygpLmxvZ291dCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdXBkYXRlVG9rZW4ocGVyaW9kaWNpdHk6bnVtYmVyKTphbnkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMua2V5Y2xvYWsoKS51cGRhdGVUb2tlbihwZXJpb2RpY2l0eSk7XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbigpOnN0cmluZyB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5rZXljbG9haygpLnRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgaXNBdXRoZW50aWNhdGVkKCk6Ym9vbGVhbiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5rZXljbG9haygpICYmIHRoaXMua2V5Y2xvYWsoKS5hdXRoZW50aWNhdGVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgX21vZHVsZS5zZXJ2aWNlKCdBdXRoJywgQXV0aFNlcnZpY2UpO1xufVxuIiwiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJhY2NvdW50c1BsdWdpbi50c1wiLz5cbi8qKlxuICogQXR0ZW50aW9uOiB0aGlzIGNsYXNzIHdpbGwgcHJvYmFibHkgYmUgcmVwbGFjZWQgYnkgdGhlIHByb3BlciBoYXd0LmlvIEtleWNsb2FrIGludGVncmF0aW9uLlxuICogV2hpbGUgaXQncyBub3QgZG9uZSwgd2UgYXJlIGRvaW5nIHRoZSBpbnRlZ3JhdGlvbiBieSBvdXJzZWx2ZXMuXG4gKi9cbm1vZHVsZSBIYXdrdWxhckFjY291bnRzIHtcblxuICAgIGV4cG9ydCBjbGFzcyBBdXRoSW50ZXJjZXB0b3JTZXJ2aWNlIHtcbiAgICAgICAgcHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckcScsICdBdXRoJ107XG5cbiAgICAgICAgcHVibGljIHN0YXRpYyBGYWN0b3J5KCRxOm5nLklRU2VydmljZSwgQXV0aDpIYXdrdWxhckFjY291bnRzLkF1dGhTZXJ2aWNlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEF1dGhJbnRlcmNlcHRvclNlcnZpY2UoJHEsIEF1dGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3RydWN0b3IocHJpdmF0ZSAkcTpuZy5JUVNlcnZpY2UsIHByaXZhdGUgQXV0aDpIYXdrdWxhckFjY291bnRzLkF1dGhTZXJ2aWNlKSB7XG4gICAgICAgIH1cblxuICAgICAgICByZXF1ZXN0ID0gKHJlcXVlc3QpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ0ludGVyY2VwdGluZyByZXF1ZXN0Jyk7XG4gICAgICAgICAgICB2YXIgQkFTRV9VUkwgPSBcImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9oYXdrdWxhci1cIjtcbiAgICAgICAgICAgIHZhciBhZGRCZWFyZXIsIGRlZmVycmVkO1xuICAgICAgICAgICAgaWYgKHJlcXVlc3QudXJsLmluZGV4T2YoQkFTRV9VUkwpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1RoZSByZXF1ZXN0ZWQgVVJMIGlzIG5vdCBwYXJ0IG9mIHRoZSBiYXNlIFVSTC4gQmFzZSBVUkw6ICcgKyBCQVNFX1VSTCArICcsIHJlcXVlc3RlZCBVUkw6ICcgKyByZXF1ZXN0LnVybCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhZGRCZWFyZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuQXV0aC51cGRhdGVUb2tlbig1KS5zdWNjZXNzKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0b2tlbiA9IHRoaXMuQXV0aC50b2tlbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnQWRkaW5nIGJlYXJlciB0b2tlbiB0byB0aGUgcmVxdWVzdDogJyArIHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QuaGVhZGVycy5BdXRob3JpemF0aW9uID0gJ0JlYXJlciAnICsgdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5ub3RpZnkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5yZXNvbHZlKHJlcXVlc3QpO1xuICAgICAgICAgICAgICAgICAgICB9KS5lcnJvcigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvdWxkbid0IHVwZGF0ZSB0b2tlblwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZGVmZXJyZWQgPSB0aGlzLiRxLmRlZmVyKCk7XG4gICAgICAgICAgICB0aGlzLkF1dGgub25SZWFkeShhZGRCZWFyZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHEud2hlbihkZWZlcnJlZC5wcm9taXNlKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXNwb25zZUVycm9yID0gKHJlamVjdGlvbikgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnSW50ZXJjZXB0aW5nIGVycm9yIHJlc3BvbnNlJyk7XG4gICAgICAgICAgICBpZiAocmVqZWN0aW9uLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogbm90aWZ5IHRoZSB1c2VyIHRoYXQgdGhlIHNlc3Npb24gaXMgZXhwaXJlZFxuICAgICAgICAgICAgICAgIHRoaXMuQXV0aC5sb2dvdXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLiRxLnJlamVjdChyZWplY3Rpb24pO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIF9tb2R1bGUuY29uZmlnKGZ1bmN0aW9uKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgY29uc29sZS5kZWJ1ZygnQWRkaW5nIEF1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICByZXR1cm4gJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChIYXdrdWxhckFjY291bnRzLkF1dGhJbnRlcmNlcHRvclNlcnZpY2UuRmFjdG9yeSk7XG4gICAgfSk7XG59XG4iLCIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImFjY291bnRzUGx1Z2luLnRzXCIvPlxubW9kdWxlIEhhd2t1bGFyQWNjb3VudHMge1xuXG4gICAgZXhwb3J0IHZhciBPcmdhbml6YXRpb25zQ29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIkhhd2t1bGFyQWNjb3VudHMuT3JnYW5pemF0aW9uc0NvbnRyb2xsZXJcIiwgW1xuICAgICAgICAnJHNjb3BlJywgJ0hhd2t1bGFyQWNjb3VudHMuT3JnYW5pemF0aW9uU2VydmljZScsICckbG9nJywgJyRsb2NhdGlvbicsXG4gICAgICAgICgkc2NvcGUsIE9yZ2FuaXphdGlvblNlcnZpY2UsICRsb2csICRsb2NhdGlvbikgPT4ge1xuXG4gICAgICAgICAgICAkc2NvcGUub3JnYW5pemF0aW9ucyA9IFtdO1xuICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgJHNjb3BlLmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZyhcIlRyeWluZyB0byBsb2FkIHRoZSBvcmdhbml6YXRpb25zIGZvciB0aGlzIHVzZXIuXCIpO1xuICAgICAgICAgICAgICAgICRzY29wZS5vcmdhbml6YXRpb25zID0gT3JnYW5pemF0aW9uU2VydmljZS5xdWVyeSh7fSxcbiAgICAgICAgICAgICAgICAgICAgKCk9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKFwiTGlzdCBvZiBvcmdhbml6YXRpb25zIHJldHJpZXZlZC5cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLndhcm4oXCJMaXN0IG9mIG9yZ2FuaXphdGlvbnMgY291bGQgTk9UIGJlIHJldHJpZXZlZC5cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAkc2NvcGUuc2hvd0NyZWF0ZUZvcm0gPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy9hY2NvdW50cy9vcmdhbml6YXRpb25zL25ldycpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICRzY29wZS5yZW1vdmUgPSAob3JnYW5pemF0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgb3JnYW5pemF0aW9uLiRyZW1vdmUoKS50aGVuKFxuICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmVkIVxuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZyhcIk9yZ2FuaXphdGlvbiByZW1vdmVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLm9yZ2FuaXphdGlvbnMuc3BsaWNlKCRzY29wZS5vcmdhbml6YXRpb25zLmluZGV4T2Yob3JnYW5pemF0aW9uKSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHNjb3BlLmxvYWQoKTtcbiAgICAgICAgfV0pO1xuXG4gICAgZXhwb3J0IHZhciBPcmdhbml6YXRpb25OZXdDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiSGF3a3VsYXJBY2NvdW50cy5Pcmdhbml6YXRpb25OZXdDb250cm9sbGVyXCIsIFtcbiAgICAgICAgJyRzY29wZScsICdIYXdrdWxhckFjY291bnRzLk9yZ2FuaXphdGlvblNlcnZpY2UnLCAnJGxvZycsICckbG9jYXRpb24nLFxuICAgICAgICAoJHNjb3BlLCBPcmdhbml6YXRpb25TZXJ2aWNlLCAkbG9nLCAkbG9jYXRpb24pID0+IHtcblxuICAgICAgICAgICAgJHNjb3BlLm9yZ2FuaXphdGlvbk5ldyA9IG5ldyBPcmdhbml6YXRpb25TZXJ2aWNlKHt9KTtcbiAgICAgICAgICAgICRzY29wZS5wZXJzaXN0ID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICRzY29wZS5vcmdhbml6YXRpb25OZXcuJHNhdmUoe30sXG4gICAgICAgICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoXCJPcmdhbml6YXRpb24gYWRkZWQuXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy9hY2NvdW50cy9vcmdhbml6YXRpb25zJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVycm9yXG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKFwiT3JnYW5pemF0aW9uIGNvdWxkIE5PVCBiZSBhZGRlZC5cIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICRsb2cuZGVidWcoXCJUcnlpbmcgdG8gcGVyc2lzdCB0aGUgb3JnYW5pemF0aW9uXCIpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfV0pO1xuXG4gICAgZXhwb3J0IHZhciBPcmdhbml6YXRpb25TZXJ2aWNlID0gX21vZHVsZS5zZXJ2aWNlKFwiSGF3a3VsYXJBY2NvdW50cy5Pcmdhbml6YXRpb25TZXJ2aWNlXCIsIFtcIiRyZXNvdXJjZVwiLCAoJHJlc291cmNlKSA9PiB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9oYXdrdWxhci1hY2NvdW50cy9vcmdhbml6YXRpb25zLzppZCcsIHtpZDonQGlkJ30pO1xuICAgIH1dKTtcblxuICAgIF9tb2R1bGUucmVxdWlyZXMucHVzaChcIm5nUmVzb3VyY2VcIik7XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
angular.module("hawkular-ui-components-accounts-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/accounts/html/accounts.html","<div class=\"row\">\n    <div class=\"col-md-12\">\n        <h1>Accounts</h1>\n        Your account can be managed directly at <a href=\"http://localhost:8080/auth/realms/hawkular/account\">Keycloak</a>.\n    </div>\n</div>\n");
$templateCache.put("plugins/accounts/html/organization_new.html","<div class=\"row\">\n    <div class=\"col-md-12\" data-ng-controller=\"HawkularAccounts.OrganizationNewController\">\n        <ol class=\"breadcrumb\">\n            <li><a data-ng-href=\"/\">Hawkular</a></li>\n            <li><a data-ng-href=\"/\">Accounts</a></li>\n            <li><a data-ng-href=\"/accounts/organizations\">Organizations</a></li>\n        </ol>\n        <h1>\n            Add Organization\n        </h1>\n\n        <form role=\"form\" class=\"form-horizontal\">\n            <div class=\"form-group\">\n                <label for=\"name\" class=\"col-md-2 control-label\">Name <span class=\"required\">*</span> </label>\n                <div class=\"col-md-6\">\n                    <input type=\"text\" class=\"form-control\" id=\"name\" placeholder=\"Name\"\n                           data-ng-model=\"organizationNew.name\">\n                </div>\n            </div>\n\n            <div class=\"form-group\">\n                <label for=\"description\" class=\"col-md-2 control-label\">Description</label>\n                <div class=\"col-md-6\">\n                    <input type=\"text\" class=\"form-control\" id=\"description\" placeholder=\"Description\"\n                           data-ng-model=\"organizationNew.description\">\n                </div>\n            </div>\n            <div class=\"col-md-8\">\n                <div class=\"pull-right\">\n                    <a data-ng-href=\"/accounts/organizations\" class=\"btn btn-default btn-lg\">Cancel</a>\n                    <button data-ng-click=\"persist()\" type=\"submit\" class=\"btn btn-primary btn-lg\">Save</button>\n                </div>\n            </div>\n\n        </form>\n    </div><!-- /col -->\n</div><!-- /row -->\n");
$templateCache.put("plugins/accounts/html/organizations.html","<div class=\"row\">\n    <div class=\"col-md-12\" data-ng-controller=\"HawkularAccounts.OrganizationsController\">\n        <ol class=\"breadcrumb\">\n            <li><a data-ng-href=\"/\">Hawkular</a></li>\n            <li><a data-ng-href=\"/\">Accounts</a></li>\n            <li><a data-ng-href=\"/accounts/organizations\">Organizations</a></li>\n        </ol>\n        <div class=\"pull-right\">\n            <button class=\"btn btn-primary\" type=\"button\" role=\"button\" data-ng-click=\"showCreateForm()\">Create</button>\n        </div>\n\n        <h1>Organizations</h1>\n        <div class=\"progress-description\" data-ng-show=\"loading\">\n            <div class=\"spinner spinner-xs spinner-inline\"></div> <strong>Loading:</strong> Organizations\n        </div>\n        <div class=\"row\" data-ng-show=\"!organizations.length && !loading\">\n            <div class=\"col-sm-6\">\n                No organizations yet. How about creating one?\n            </div>\n        </div>\n\n        <div data-ng-show=\"organizations.length && !loading\">\n            <table class=\"table table-striped table-bordered\">\n                <thead>\n                    <tr>\n                        <th>Name</th>\n                        <th>Description</th>\n                        <th>&nbsp;</th>\n                    </tr>\n                </thead>\n                <tbody>\n                    <tr data-ng-repeat=\"organization in organizations\">\n                        <td>{{organization.name}}</td>\n                        <td>{{organization.description}}</td>\n                        <td>\n                            <button type=\"button\" class=\"btn btn-default\" aria-label=\"Remove\" data-ng-click=\"remove(organization)\">\n                                <span class=\"pficon pficon-delete\" aria-hidden=\"true\"></span>\n                            </button>\n                        </td>\n                    </tr>\n                </tbody>\n            </table>\n        </div>\n    </div><!-- /col -->\n\n</div>\n</div>\n");}]); hawtioPluginLoader.addModule("hawkular-ui-components-accounts-templates");