var STAGGERN = 4; // delay for each node
var STAGGERD = 200; // delay for each depth
var HAS_CHILDREN_COLOR = 'lightsteelblue';
var DURATION = 700; // d3 animation duration
var CK_API = 'https://api.cryptokitties.co/kitties/';
var NODESIZEX = "750";
var NODESIZEY =  "450";
var DEFAULTKITTYID = "101" // BugCat

var treeData; // json data containing tree structure
var curNode;  // currently selected node
var transitionDuration;
var maxDepth = 1; // tracks max depth of tree structure
var autoCollapse = false;
var viewerWidth, viewerHeight, center; // screen resolution and center
var zoomListener;
var zoomScale = 1; // current scale set via zooming
var centerOnUpdate = false;
var showJewels = true; // if jewels are being displayed


var activityTimeout = 4500;
var updatePeriod = 3500;



//getTimeStamp = () => Math.floor(Date.now());

/*stillActive = () => {
    var curActivity = getTimeStamp() - lastActivity < activityTimeout;
    var activity = (curActivity || prevActivity);
    prevActivity = curActivity;
    return activity;
}*/

// TODO: redesign
var kittyId;
function GetKittyId()
{
    // check if kitty id already in url
    var urlData = {};
    var temp = window.location.href.split("?");
    if (temp.length > 1)
        urlData = Ext.urlDecode(temp[1]);
    if ('kid' in urlData)
        kittyId = urlData['kid'];
    else
    {
        kittyId = prompt("Please enter the kitty id: ", DEFAULTKITTYID);
        updateURL();
    }
}
GetKittyId();

function updateURL() {
    if (history.pushState) {
        var urlData = Ext.urlEncode({'kid': kittyId});
        var newurl =  `${window.location.protocol}//${window.location.host}${window.location.pathname}?${urlData}`;
        window.history.pushState({path:newurl},'',newurl);
    }
}

var kittyCnt = 0;
var kittyLimit = 2500;
//var lastActivity = getTimeStamp();

// create entry for our tree
function buildNode(data)
{
    var node =
    {
        'id': data.id,
        'name': (data.name == null) ? "Kitty #" + data.id : data.name,
        'gen': data.generation,
        'color': data.color,
        //'bio': generateBio(data),
        'image': data.image_url,
        //'jewels': getJewels(data),
        'kids': [] // temp location to avoid empty list bugs]
    }

    //var children = [];
    //lastActivity = getTimeStamp();

    function fetchChildData(child){
        var url = `${CK_API}${child['id'].toString()}`;
        (function fetch() {
            $.getJSON(url, function(data) {
                if (node.kids)
                {
                    node.kids.push(buildNode(data));
                    node.children = node.kids;
                    delete node.kids;
                }
                else
                    node.children.push(buildNode(data));
            }).fail(function( jqxhr, textStatus, error ) {
                if (jqxhr.status == 429) { // Too Many Requests
                    //lastActivity = getTimeStamp() + 61000;
                    //growl429();
                    setTimeout(fetch, 61000);
                } else if (jqxhr.status == 500) { // Internal error
                    setTimeout(fetch, 500);
                } else {
                    console.log(jqxhr);
                }
                });
        })();
    }

    data.children.forEach((child) => {
        kittyCnt++
        if (kittyCnt < kittyLimit)
            fetchChildData(child);
        else
            console.log("Kitty limit reached!!!");
    });

    return node;
}

//var updateLoop;
// !!!START!!!
/*$(document).ready(function() {
    // init
    // TODO: consider a helper function here
    var url = `${CK_API}${kittyId.toString()}`;
    initInterface();

    // kick off recursive calls and tree updates
    $.getJSON(url, function(data) {
        treeData = buildNode(data);  // init tree data
        drawTree();
        updateLoop = setTimeout(treeUpdateLoop, 500);
        checkIfDone();
    });
});*/

function initInterface() {
    // set values
    $('input[name="kittyLimit"]').val(kittyLimit);
    $('input[name="showJewels"]').prop('checked', showJewels);
    $('input[name="centerOnUpdate"]').prop('checked', centerOnUpdate);
    $('input[name="autoCollapse"]').prop('checked', autoCollapse);

    // set listeners
    $('input[name="kittyLimit"]').on('change', (e) => kittyLimit = e.currentTarget.value);
    $('input[name="centerOnUpdate"]').on('change', (e) => centerOnUpdate = e.currentTarget.checked);
    $('input[name="autoCollapse"]').on('change', (e) => autoCollapse = e.currentTarget.checked);

    $('input[name="showJewels"]').on('change', (e) => {
        showJewels = e.currentTarget.checked;
        update(root);
    });

    $('button[name="goToKitty"]').on('click', () => {
        var goToID = prompt("Please enter the kitty id: ");
        centerNode(d3tree.nodes(root).find((d) => d.id == goToID));
    });

    // Setup keyboard interfacing
    document.addEventListener("keydown", function(event) {
        //console.log(event.which);
        switch (event.which) {
            case 71:
                console.log("You just pressed g!");
                break;
        }
    });

}

function getTree() {
    // helper to count children
    function childCnt(n) {
        return n.data.children ? n.data.children.length : 0;
    }

    // NOTE: sorting
    /*var sorted = d3.hierarchy(treeData).sort(function(a, b) {
        var genOrder = d3.ascending( a.data.gen, b.data.gen );
        if (genOrder != 0) return genOrder;

        return d3.ascending( a.data.name, b.data.name );
        //return d3.ascending( childCnt(a), childCnt(b) );
    });*/

    var sorted = d3.hierarchy(treeData)
        .sum(function(d) { return d.value; })
        .sort(function(a, b) { return b.height - a.height });

    return d3tree(sorted);
}

/*function treeUpdateLoop() {
    console.log(`Kitty count: ${kittyCnt}`);

    // TODO: double check this is necessary
    // update root using a new tree from treeData

    var newTree = getTree();
    root = Object.assign(root, newTree);
    if (autoCollapse) // collapse after the second level
        root.children.forEach(collapse);

    if (centerOnUpdate)
        updateAndCenter(root);
    else
        update(root);

    updateLoop = setTimeout(treeUpdateLoop, updatePeriod); // NOTE: use updateLoop?
}*/

/*function checkIfDone() {
  if (stillActive())
    setTimeout(checkIfDone, activityTimeout);
  else
    clearTimeout(updateLoop);
}*/

// Here lies modified descendant_tree code
var d3tree;
var root;
var svgGroup;
// Misc. variables
var i = 0;
var maxLabelLength = 30;
var nodeRadius = 29;
var first = true;
var selectedKittyID;
var gnode;

var stratify;

var kittyUrl = 'https://www.cryptokitties.co/kitty/'

function drawTree() {

    // size of the diagram
    viewerWidth = $(document).width();
    viewerHeight = $(document).height();
    center = { x: viewerWidth/2, y: viewerHeight/2 };

    // TODO: Feature -> allow d3.cluster()
    d3tree = d3.tree()
        //.size([Math.PI, viewerWidth])
        .nodeSize([NODESIZEX, NODESIZEY])
        .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2.5) / a.depth; });

    // Define the zoom function for the zoomable tree
    zoom = () => {
        var transform = d3.event.transform;
        zoomScale = transform.k;
        svgGroup.attr("transform", `translate(${[transform.x, transform.y]})scale(${zoomScale})`);
    }

    // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    zoomListener = d3.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

    // define the baseSvg, attaching a class for styling and the zoomListener
    var baseSvg = d3.select("#tree-container").append("svg")
        .attr("width", viewerWidth)
        .attr("height", viewerHeight)
        .attr("class", "overlay")
        //.on("click", console.log("BAnanana!!!!"))
        .call(zoomListener);

    // Append a group which holds all nodes and which the zoom Listener can act upon.
    svgGroup = baseSvg.append("g");

    // TODO: figure out better way to wire ui... this is silly
    setCenterOnUpdate = (bool) => { centerOnUpdate = bool; $('input[name="centerOnUpdate"]').prop('checked', bool); }

    //baseSvg.on("mousedown", () => setCenterOnUpdate(false));
    //baseSvg.on("mousedown", console.log("BAnanana!!!!"));

    // Layout the tree initially and center on the root node.
    root = getTree();
    update(root);

    handleNodePic = (n) => {
        var bio = n.attr("title");
        var img = n.attr("href");
        var kid = n.attr("kid");
        $("#mainbio").html(`<div id="kittypic"><a href="${kittyUrl}${kid}" target="_blank"><img src="${img}"></a></div> <div id="biotext">${bio}</div>`);
        selectedKittyID = kid;
    }

    // Show biography and picture on hover
    $("body").hoverIntent({
      over: function() {
          $("#bio").fadeIn("fast");
          var self = $(this);
          switch (self.attr("class")) {

              case "gempic":
                var img = self.attr("href");
                var gemtype = self.attr("gemtype");
                // move node to parent and grab jewels
                self = d3.select(this.parentNode).select("image.nodepic");

                var jewels = self.data()[0].data.jewels;
                var jewelInfo = "";
                jewels[gemtype].forEach((d) => {
                    // TODO: pictures should link some better way than this..
                    jewelInfo += `<div id="familyJewels"><div id="gemPosition">${d.position}</div><a href="${kittyUrl}${d.kittyId}" target="_blank"><img src="https://storage.googleapis.com/ck-kitty-image/0x06012c8cf97bead5deae237070f9587f8e7a266d/${d.kittyId}.svg"></a><div id="gemDescription">${d.description}</div></div>`
                });
                handleNodePic(self); // NOTE: make sure the kitty node is shown...
                $("#subbio").html(`<div id="gemPic"><img src="${img}"></div> <div id="gemDetails">${jewelInfo}</div>`);
                $("#subbio").fadeIn("fast");
                break;

              case "nodepic":
                if (selectedKittyID != self.attr("kid"))
                {
                    $("#subbio").fadeOut("fast");
                    handleNodePic(self);
                }
                break;
          }

      },
      // TODO: fadeOut...
      out: () => {}, // NOTE: eats some errors
      /*out: function() {
        $("#bio").fadeOut("fast");
      },*/
      selector: ".node image"
    });
}

function update(source, center=false) {

    var transitionDuration = d3.event && d3.event.altKey ? DURATION * 4 : DURATION;

    // Compute the new tree layout.
    var nodes = root.descendants(),
        links = root.links();

    // Set widths & heights between levels based on maxLabelLength.
    nodes.forEach(function(d) {
        if (d.depth > maxDepth)
            maxDepth = d.depth;
    });

    gnode = svgGroup.selectAll("g.node").data(nodes, (d) => d.id || (d.id = ++i) );

    nodeEntry(source);

    // Transition nodes to their new position.
    // NOTE: stretching x-axis
    var nodeUpdate = gnode.transition()
        .duration(transitionDuration)
        .attr("transform", (d) => `translate(${project(d)})scale(${2*Math.sqrt(maxDepth-d.depth + d.children ? d.children.length : 1)})`);

    // Fade the text in
    nodeUpdate.select("text").style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = gnode.exit().transition()
        .duration(transitionDuration)
        //.attr('transform', () => `translate(${project(source.x, source.y)})`)
        .remove();
    nodeExit.select('circle').attr('r', 0);
    nodeExit.select('text').style('fill-opacity', 0);

    // Update the links…
    var link = svgGroup.selectAll("path.link").data(links, (d) => d.id );

    //var linkVertical = d3.linkVertical().x((d) => project(d)[0]).y((d) => project(d)[1]);

    /*function linkArc(d) {
        // TODO: need to do projections far too
        var source = project(d.source);
        var target = project(d.target);
        return `M${source[0]},${source[1]}L${target[0]},${target[1]}`;
    }*/

    function linkArc(d) {
        var source = project(d.source);
        var target = project(d.target);

        var mx = (target[0] + source[0]) / 2,
            my = (target[1] + source[1]) / 2,
            dx = mx - source[0],
            dy = my - source[1],
            dr = Math.sqrt(dx * dx + dy * dy),
            sweepFlag = (target[0] - source[0] == 0) ? (source[0] - (d.source.parent ? project(d.source.parent)[0] : 0)) < 0 : dx > 0;

        return `M${source[0]},${source[1]}A${dr},${dr} 0 0,${sweepFlag ? 0 : 1} ${mx},${my} A${dr},${dr} 0 0,${+sweepFlag} ${target[0]},${target[1]}`;
    }

    // Enter any new links at the parent's previous position.
    link.enter().insert('path', 'g')
        .attr('class', 'link')
        .attr('d', linkArc)
        .style('stroke-width', (d) => `${Math.sqrt(maxDepth - d.source.depth + (d.target.data.children ? d.target.data.children.length : 1))}px`);

    // Transition links to their new position.
    link.transition().duration(transitionDuration)
        .delay( (d, i) => i * STAGGERN + Math.abs(d.source.depth - curNode.depth) * STAGGERD )
        .attr('d', linkArc);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        //.duration(transitionDuration)
        //.attr('d', linkArc)
        .remove();

    // Stash the old positions for transition.
    nodes.forEach((d) => { d.x0 = d.x; d.y0 = d.y;});
}


// TODO: this is the variable part...
function nodeEntry(source) {
    // Toggle children on click.
    function click(d) {
        if (d3.event.defaultPrevented) return; // click suppressed
        toggleChildren(d);
    }

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = gnode.enter().append('g', ':first-child')
        .attr('class', 'node')
        .attr("transform", (d) => {
            //${maxDepth - d.source.depth + (d.target.data.children ? d.target.data.children.length : 0)}
            return `translate(${project(d)})scale(${2*Math.sqrt(maxDepth-d.depth + d.children ? d.children.length : 1)})`;
        })
        .on('click', click); // TODO: more stuff

    nodeEnter.append('circle')
             .attr('class', 'nodeCircle')
             .attr('r', nodeRadius)
             .attr('class', (d) => `nodeCircle u-bg-alt-${d.data.color}`);

    nodeEnter.append("text")
             .attr('class', 'nodeText')
             .attr("x", 0)
             .attr("y", -35 )
             .attr("dy", "0em")
             .attr("text-anchor", "middle")
             .style("fill-opacity", 1)
             .text( (d) => d.data.name );

    nodeEnter.append("image")
             .attr('title', (d) => d.data.bio)
             .attr('kid', (d) => d.data.id)
             .attr("xlink:href", (d) => (d.data) ? d.data.image : "https://www.cryptokitties.co/images/kitty-love-3.svg")
             .attr("class", "nodepic")
             .attr("x", -40)
             .attr("y", -42)
             .attr("width", 85)
             .attr("height", 85);
}


// highlight selected node
function selectNode(node) {
    if (curNode) delete curNode.selected;
    curNode = node;
    curNode.selected = true;
    curPath = []; // filled in by fullpath
    d3.select('#selection').html(fullpath(node));
}

// for displaying full path of node in tree
function fullpath(d, idx) {
    idx = idx || 0;
    curPath.push(d);
    return (d.parent ? fullpath(d.parent, curPath.length) : '') +
        '/<span class="nodepath'+(d.name === root.name ? ' highlight' : '')+
        '" data-sel="'+ idx +'" title="Set Root to '+ d.name +'">' +
        d.name + '</span>';
}

function project(d) {
    //return radial(d.x,d.y);
    return [d.x, d.y];
}

var halfPI = Math.PI/2;
function radial(x,y) {
    if (y == 0) return [0, 0];
    var angle = (x/2) + halfPI, radius = y;
    //var angle = x, radius = y;
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

// Toggle children function
function toggleChildren(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else if (d._children) {
        d.collapsed = false;
        d.children = d._children;
        d._children = null;
    }
    return d;
}

// collapse the node and all it's children
function collapse(d) {
    d.collapsed = true;
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}