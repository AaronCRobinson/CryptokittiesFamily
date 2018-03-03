// cktools.js
CK_API = 'https://api.cryptokitties.co/kitties/';
ACTIVITY_TIMEOUT = 4500;

lastActivity = getTimeStamp();
kittyCnt = 0;
kittyLimit = 2500;
kittyData = {'nodes': {}, 'links': new Set()}; // contains the graph structure of a set of kitties

// TODO: remove the need for this.
/*function buildKittyLookUp() {
    kittyById = d3.map([...kittyData.nodes], function(d) { return d.id; })
    //kittyById = d3.map(kittyData.nodes, function(d) { return d.id; })
}*/

function getTimeStamp() {
    Math.floor(Date.now());
}

function getKittyData(kittyData, kittyId, traverseChildren = false, traverseParents = false) {
    lastActivity = getTimeStamp();
    if (kittyCnt < kittyLimit) {
        kittyCnt++;
        $.getJSON(`${CK_API}${kittyId}`, function(data) {
            //kittyData.nodes.add(buildGraphNode(data));
            var nodeData = buildGraphNode(data);
            kittyData.nodes[nodeData.id] = nodeData;

            if (traverseChildren) {
                var newLinks = buildChildrenGraphLinks(data);
                for (i=0; i < newLinks.length; ++i)
                    kittyData.links.add(newLinks[i]);

                data.children.forEach( (child) => {
                    // TODO:
                    //if (child.id)
                    getKittyData(kittyData, child.id, traverseChildren, traverseParents)
                });
            }
            if (traverseParents) {
                if ('id' in data.matron)
                    getKittyData(kittyData, data.matron.id, traverseChildren, traverseParents)
                if ('id' in data.sire)
                    getKittyData(kittyData, data.sire.id, traverseChildren, traverseParents)
            }
        }).fail(function( jqxhr, textStatus, error ) {
            if (jqxhr.status == 429) { // Too Many Requests
                lastActivity = getTimeStamp() + 61000;
                growl429();
                setTimeout(fetch, 61000);
            } else if (jqxhr.status == 500) { // Internal error
                setTimeout(fetch, 500);
            } else {
                console.log(jqxhr);
            }
        });
    } //else
        //console.log("Kitty limit reached!!!");

}

var prevActivity = true;
function stillActive() {
    var curActivity = getTimeStamp() - lastActivity < ACTIVITY_TIMEOUT;
    console.log(curActivity);
    var activity = (curActivity || prevActivity);
    prevActivity = curActivity;
    return activity;
}

function growl429() {
    $.growlUI('Still fetching kitties', 'Please be patient!');
    console.log("429 error");
}

function buildForceGraph(startingKittyId) {
    getKittyData(kittyData, startingKittyId, true, true);
}

function buildGraphNode(data) {
    return {
        'id': data.id,
        'name': (data.name == null) ? "Kitty #" + data.id : data.name,
        'gen': data.generation,
        'color': data.color,
        //'bio': generateBio(data),
        'image': data.image_url,
        'jewels': getFamilyJewels(data)
    };
}

// iterates over the current data's children building links
function buildChildrenGraphLinks(data) {
    var children = [];
    data.children.forEach( (child) => {
        children.push({
            'source': data.id,
            'target': child.id
        });
    });
    return children;
}

// reorganizes the family jewels into groupings which allows for easier counting
function getFamilyJewels(data) {

    var jewels = {'diamond':[], 'gold':[], 'purple':[], 'blue':[]};
    data['enhanced_cattributes'].forEach( (c) => {
        if (c['position'] == -1)
            return;
        if (c['position'] == 1) { // TODO: finish
            jewels['diamond'].push(c);
        } else if (c['position'] < 11) {
            jewels['gold'].push(c);
        } else if (c['position'] < 101) {
            jewels['purple'].push(c);
        } else if (c['position'] < 501) {
            jewels['blue'].push(c);
        }
    });

    return jewels;
}