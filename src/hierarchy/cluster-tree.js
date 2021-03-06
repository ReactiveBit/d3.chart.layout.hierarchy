
d3.chart("hierarchy").extend("cluster-tree", {

  initialize : function() {

    var chart = this;

    var counter = 0;

    chart.radius(chart._radius || 4.5);

    chart._width  = chart.base.attr("width");
    chart._height = chart.base.attr("height");

    chart.layers.links = chart.layers.base.append("g").classed("links", true);
    chart.layers.nodes = chart.layers.base.append("g").classed("nodes", true);


    chart.layer("nodes", chart.layers.nodes, {

      dataBind: function(data) {
        return this.selectAll(".node").data(data, function(d) {
          return d._id || (d._id = ++counter);
        });
      },

      insert: function() {
        return this.append("g")
          .classed("node", true);
      },

      events: {
        "enter": function() {
          chart._initNode(this);

          this.append("circle")
            .attr("r", 0);

          this.append("text")
            .attr("dy", ".35em")
            .text(function(d) { return d[chart._name]; })
            .style("fill-opacity", 0);

          this.on("click", function (event) {
            chart.trigger("click:node", event);
          });
        },

        "merge": function() {
          // Set additional node classes as they may change during manipulations
          // with data. For example, a node is added to another leaf node, so
          // ex-leaf node should change its class from node-leaf to node-parent.
          chart._initNode(this);

          // Function .classed() is not available in transition events.
          this.classed('node-collapsed', function (d) {
            return d._children !== undefined;
          });


          this.select("text")
            .attr("x", function(d) {
              return d.isLeaf ? 10 : -10;
            })
            // TODO: fix weird animation due to change text-anchor.
            .attr("text-anchor", function(d) {
              return d.isLeaf ? "start" : "end";
            });
        },

        "merge:transition": function() {
          this.select("circle")
            .attr("r", chart._radius);

          this.select("text")
            .style("fill-opacity", 1);
        },

        "exit:transition": function() {
          this.duration(chart._duration)
            .remove();

          this.select("circle")
            .attr("r", 0);

          this.select("text")
            .style("fill-opacity", 0);
        }
      }
    });


    chart.layer("links", chart.layers.links, {
      dataBind: function(data) {
        return this.selectAll(".link")
          .data(chart.d3.layout.links(data), function(d) { return d.target._id; });
      },

      insert: function() {
        return this.append("path").classed("link", true);
      },

      events: {
        "enter": function() {
          this
            .attr("d", function(d) {
              var o = { x: chart.source.x0, y: chart.source.y0 };
              return chart.d3.diagonal({ source: o, target: o });
            });
        },

        "merge:transition": function() {
          this.duration(chart._duration)
            .attr("d", chart.d3.diagonal)
            .attr("stroke", function(d) { return d.source.path && d.target.path ? "#dd7b7b" : "#ccc"; })
            .style("stroke-width", function(d) { return d.path ? 1 : 1.5; });
        },

        "exit:transition": function() {
          this.duration(chart._duration)
            .attr("d", function(d) {
              var o = { x: chart.source.x, y: chart.source.y };
              return chart.d3.diagonal({ source: o, target: o });
            })
            .remove();
        }
      }
    });
  },

  /**
   * Initializes node attributes.
   *
   * @param node SVG element that represents node.
   * @private
   */
  _initNode: function(node) {
    node
      .classed("node-leaf", function(d) { return d.isLeaf; })
      .classed("node-parent", function(d) { return !d.isLeaf; });
  },


  radius: function(_) {
    if( ! arguments.length ) {
      return this._radius;
    }

    if( _ === "_COUNT" ) {
      this._radius = function(d) {
        if( d._children ) {
          return d._children.length;
        } else if( d.children ) {
          return d.children.length;
        }
        return 1;
      };

    } else {
      this._radius = _;
    }

    this.trigger("change:radius");
    if( this.root ) {
      this.draw(this.root);
    }

    return this;
  },



  collapsible: function(_) {
    var chart = this;

    if (this._isFeatureEnabled('collapsible')) {
      return;
    }

    this._setFeatureEnabled('collapsible', true);

    var depth = _;

    chart.once("collapse:init", function() {

      if( depth !== undefined ) {

        chart.walker(

          chart.root,

          function(d) { if( d.depth == depth ) { collapse(d); }},

          function(d) {
            if( d.children && d.children.length > 0 && d.depth < depth ) {
              return d.children;
            } else if( d._children && d._children.length > 0 && d.depth < depth ) {
              return d._children;
            } else {
              return null;
            }
          }
        );
      }
    });


    chart.on("click:node", function(d) {
      d = toggle(d);

      chart.trigger("transform:stash");

      // Set _internalUpdate, so chart will know that certain actions shouldn't
      // be performed during update.
      chart._internalUpdate = true;
      chart.draw(d);
      chart._internalUpdate = false;
    });


    function toggle(d) {
      if( d.children ) {
        d._children = d.children;
        d.children = null;
      } else if( d._children ) {
        d.children = d._children;
        d._children = null;
      }
      return d;
    }


    function collapse(d) {
      if( d.children ) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    }

    return chart;
  }
});


