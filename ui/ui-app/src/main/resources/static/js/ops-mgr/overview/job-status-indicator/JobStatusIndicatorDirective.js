define(['angular','ops-mgr/overview/module-name'], function (angular,moduleName) {

    var directive = function () {
        return {
            restrict: "EA",
            scope:true,
            controllerAs:'vm',
            bindToController: {
                panelTitle: "@",
                refreshIntervalTime:"@"
            },
            templateUrl: 'js/ops-mgr/overview/job-status-indicator/job-status-indicator-template.html',
            controller: "JobStatusIndicatorController",
            link: function ($scope, element, attrs) {
                $scope.$on('$destroy', function() {
                });
            } //DOM manipulation\}
        }

    };

    var controller = function ($scope,$element,$http, $q,$interval,OpsManagerJobService, HttpService,ChartJobStatusService) {
        var self = this;
        this.refreshInterval = null;
        this.dataLoaded = false;
        this.chartApi = {};
        this.chartConfig = {

        }

        this.running = 0;
        this.failed = 0;
        this.chartData = [];
        this.runningCounts = [];
        var maxDatapoints = 20;
        this.chartOptions =  {
            chart: {
                type: 'lineChart',
                margin : {
                    top: 5,
                    right: 5,
                    bottom:10,
                    left: 20
                },
                x: function(d){return d[0];},
                y: function(d){return d[1];},
                useVoronoi: false,
                clipEdge: false,
                duration: 0,
                height:136,
                useInteractiveGuideline: true,
                xAxis: {
                    axisLabel: 'Time',
                    showMaxMin: false,
                    tickFormat: function(d) {
                        return d3.time.format('%X')(new Date(d))
                    }
                },
                yAxis: {
                    axisLabel:'Running',
                    "axisLabelDistance": -10,
                    showMaxMin:false,
                    tickSubdivide:0,
                    ticks:1
                },
                yDomain:[0,1],
                showLegend:false,
                showXAxis:false,
                showYAxis:true,
                dispatch: {

                }
            }
        };
        this.updateChart = function(){
            if(self.chartApi.update) {
                self.chartApi.update();
            }
        }

        function getRunningFailedCounts() {
                var successFn = function (response) {
                    if(response){
                     updateCounts(response.data);
                        if(self.runningCounts.length >= maxDatapoints){
                            self.runningCounts.shift();
                            self.chartData[0].values.shift();
                        }
                        var dataItem = {status:'RUNNING_JOB_ACTIVITY',date:new Date().getTime(), count:self.running}
                        self.runningCounts.push(dataItem);
                        addChartData(dataItem);
                        self.dataLoaded = true;
                    }

                }

                var errorFn = function (data, status, headers, config) {
                    console.log("Error getting count by status: ", data, status);
                }



                $http.get(OpsManagerJobService.RUNNING_OR_FAILED_COUNTS_URL).then( successFn, errorFn);

        };

        function refresh(){
            getRunningFailedCounts();
        }

        function updateCounts(responseData) {
            //zero them out
            self.running =0;
            self.failed = 0;
            if(responseData){

                angular.forEach(responseData,function(statusCount,i){
                    if(statusCount.status == 'RUNNING'){
                        self.running = statusCount.count;
                    }
                    else if(statusCount.status =='FAILED'){
                        self.failed = statusCount.count;
                    }
                })
            }
        }


        function addChartData(data){
            if(self.chartData.length >0) {
                self.chartData[0].values.push([data.date, data.count]);
            }
            else {
               var initialChartData = ChartJobStatusService.toChartData([data]);
                initialChartData[0].key = 'Running';
                self.chartData = initialChartData;
            }
            var max = d3.max(self.runningCounts, function(d) {
                return d.count; } );
            if(max == undefined || max ==0) {
                max = 1;
            }
            else {
                max +=1;
            }
            if(self.chartOptions.chart.yAxis.ticks != max) {
                self.chartOptions.chart.yDomain = [0, max];
                var ticks = max;
                if(ticks > 8){
                    ticks = 8;
                }
                self.chartOptions.chart.yAxis.ticks = ticks;
            }
        }


        function createChartData(responseData){
            self.chartData = ChartJobStatusService.toChartData(responseData);
            var max = d3.max(self.runningCounts, function(d) {
                return d.count; } );
            if(max == undefined || max ==0) {
                max = 1;
            }
            else {
                max +=1;
            }
            self.chartOptions.chart.yDomain = [0, max];
            self.chartOptions.chart.yAxis.ticks =max;
          //  self.chartApi.update();
        }


        this.clearRefreshInterval = function() {
            if(self.refreshInterval != null){
                $interval.cancel(self.refreshInterval);
                self.refreshInterval = null;
            }
        }

        this.setRefreshInterval = function() {
            self.clearRefreshInterval();
            if(self.refreshIntervalTime) {
                self.refreshInterval = $interval(refresh,self.refreshIntervalTime);

            }
        }

        this.init = function () {
            refresh();
       //     self.getJobCountByStatus();
            self.setRefreshInterval();
        }

        this.init();

        $scope.$on('$destroy', function(){
            self.clearRefreshInterval();
        });
    };

    angular.module(moduleName).controller('JobStatusIndicatorController', ["$scope","$element","$http","$q","$interval","OpsManagerJobService","HttpService","ChartJobStatusService",controller]);


    angular.module(moduleName)
        .directive('tbaJobStatusIndicator', directive);

});

