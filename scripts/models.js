var CK_API = "https://api.cryptokitties.co";

Ext.define('Owner', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'address',  type: 'string'},
        {name: 'nickname', type: 'string'},
        {name: 'image',    type: 'string'}
    ]
});

Ext.define('Status', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'is_ready',       type: 'bool'},
        {name: 'is_gestating',   type: 'bool'},
        {name: 'cooldown',       type: 'int'},
        {name: 'cooldown_index', type: 'int'}
    ]
});

Ext.define('Purrs', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'count',     type: 'int'},
        {name: 'is_purred', type: 'bool'}
    ]
});

Ext.define('Watchlist', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'count',     type: 'int'},
        {name: 'is_purred', type: 'bool'}
    ]
});

// NOTE: you could abstract this again...without nested models
// Modeled more after CK auctions api data (more limited in scope)
Ext.define('KittyBasic', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'id',            type: 'int'},
        {name: 'name',          type: 'string'},
        {name: 'image_url',     type: 'string'},
        {name: 'image_url_cdn', type: 'string'},
        {name: 'generation',    type: 'int'},
        // {name: 'created_at',    type: 'string'}, // not found in CK auctions api
        {name: 'color',         type: 'string'},
        {name: 'is_fancy',      type: 'bool'},
        {name: 'is_exclusive',  type: 'bool'},
        {name: 'fancy_type',    type: 'string'},
        {name: 'fancy_ranking',    type: 'string'},
        {name: 'language',    type: 'string'},
        {name: 'hatched',       type: 'bool'}
    ],
    hasOne: [{
        model: 'Owner',
        name: 'owner'
    }, {
        model: 'Status',
        name: 'status'
    }, {
        model: 'Purrs',
        name: 'purrs'
    }, {
        model: 'Watchlist',
        name: 'watchlist'
    }]
});

function createPlayerKittiesStore() {
    return Ext.create('Ext.data.Store', {
        model: 'KittyBasic',
        autoLoad: false,
        proxy: {
            type: 'ajax',
            reader: {
                type: 'json',
                root: 'kitties'
            }
        },
        sorters: [{
             property: 'generation',
             direction: 'ASC'
         }]
    });
}

function createPlayerKittiesView(store, target) {
    var kittyTpl = new Ext.XTemplate(
        '<tpl for=".">',
            '<div class="thumb-wrap">',
                '<div class="u-bg-alt-{color}"><img class="largeThumbNail" src="{image_url}"></div>',
                '<div>{id} - {name}</div>',
            '</div>',
        '</tpl>'
    );

    return Ext.create('Ext.view.View', {
        store: store,
        tpl: kittyTpl,
        itemSelector: 'div.thumb-wrap',
        emptyText: 'No images available',
        renderTo: Ext.Element.get('player-kitties')
    });
}

// TODO: rework
function requestPlayerKitties(addr, offset=0, limit=20, parents=false) {
    //console.log(`${CK_API}/kitties?offset=${offset}&limit=${limit}&owner_wallet_address=${addr}&parents=${parents}`);
    Ext.Ajax.request({
        url: `${CK_API}/kitties?offset=${offset}&limit=${limit}&owner_wallet_address=${addr}&parents=${parents}`,

        success: function(response, opts) {
            var obj = Ext.decode(response.responseText);
            playerKittyStore.loadRawData(obj, true);
            if (offset + limit < obj.total)
                requestPlayerKitties(addr, offset+limit, limit, parents);
        },

        failure: function(response, opts) {
            console.log('server-side failure with status code ' + response.status);
        }
    });
}

function populationPlayerKitties(addr) {
    console.log("populationPlayerKitties");
    //playerKittyStore.clear();
    playerKittyStore = createPlayerKittiesStore();
    createPlayerKittiesView(playerKittyStore);
    requestPlayerKitties(addr.toLowerCase());
}

Ext.define('Seller', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'address',  type: 'string'},
        {name: 'nickname', type: 'string'},
        {name: 'image',    type: 'string'}
    ]
});

Ext.define('AuctionBasic', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'start_price',   type: 'string'},
        {name: 'end_price',     type: 'string'},
        {name: 'start_time',    type: 'string'},
        {name: 'end_time',      type: 'string'},
        {name: 'current_price', type: 'string'},
        {name: 'duration',      type: 'string'},
        {name: 'status',        type: 'string'},
        {name: 'type',          type: 'string'},
        {name: 'id',             type: 'int'},
    ],
    hasOne: [{
        model: 'Seller',
        name: 'seller'
    }]
});

Ext.define('AuctionFull', {
    extend: 'AuctionBasic',
    hasOne: [{
        model: 'KittyBasic',
        name: 'kitty'
    }]
});

function createAuctionStore() {
    return Ext.create('Ext.data.Store', {
        model: 'AuctionFull',
        autoLoad: false,
        proxy: {
            type: 'ajax',
            reader: {
                type: 'json',
                root: 'auctions'
            }
        },
        sorters: [{
             property: 'start_time', //'id',
             direction: 'DESC'
         }]
    });
}

function createAuctionView(store, target) {
    var kittyTpl = new Ext.XTemplate(
        '<tpl for=".">',
            '<div class="thumb-wrap">',
                '<a href="https://www.cryptokitties.co/kitty/{kitty.id}" target="_blank">',
                    '<div class="u-bg-alt-{kitty.color}"><img class="largeThumbNail" src="{kitty.image_url}"></div>',
                '</a>',
                '<div>{kitty.id} - {[this.convertPrice(values.current_price)]}</div>',
            '</div>',
        '</tpl>',
        {
            disableFormats: true,
            convertPrice: function(wei) {
                var l = 4 + wei.length - 19;
                var s = 0; //todo
                var sigDigits = wei.substr(0,l);
                while (sigDigits.length < 4) // TODO: better this
                    sigDigits = "0" + sigDigits; // LOL
                // TODO: this should be format string (but was causing code to break)
                return sigDigits[s] + '.' + sigDigits.substr(1);
            }
        }
    );

    return Ext.create('Ext.view.View', {
        store: store,
        tpl: kittyTpl,
        itemSelector: 'div.thumb-wrap',
        emptyText: 'No images available',
        renderTo: Ext.Element.get('auctions')
    });
}

var briefWait = 800;
var waitAMin = 61000;

function requestAuctions(offset=0, limit=20, parents=false) {
    function ajaxRequest(offset, limit) {
        Ext.Ajax.request({
            // TODO: variable type here
            url: `${CK_API}/auctions?offset=${offset}&limit=${limit}&type=sale&status=open&orderBy=start_time&orderDirection=desc&parents=${parents}`,

            success: function(response, opts) {
                var obj = Ext.decode(response.responseText);
                auctionStore.loadRawData(obj, true);
                if (offset + limit < obj.total)
                    setTimeout(()=> {requestAuctions(offset+limit, limit, parents);}, briefWait);
            },

            failure: function(response, opts) {
                if (response.status == 429) // retry after 61 seconds
                    setTimeout(() => {ajaxRequest(offset, limit);}, waitAMin);
                else
                    console.log('server-side failure with status code ' + response.status);
            }
        });
    }
    ajaxRequest(offset, limit);
}

function populationAuctions() {
    console.log("populationAuctions");
    auctionStore = createAuctionStore();
    createAuctionView(auctionStore);
    requestAuctions();
}

Ext.define('Cattribute', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'description',   type: 'string'},
        {name: 'type',     type: 'string'},
        {name: 'total',    type: 'int'} // TODO: this type will have to change
    ]
});

function createCattributeStore() {
    return Ext.create('Ext.data.Store', {
        model: 'Cattribute',
        autoLoad: false,
        proxy: {
            type: 'ajax',
            reader: {
                type: 'json',
                root: (d) => d // no root
            }
        }
    });
}

function requestCattributes(callback) {
    function ajaxRequest() {
        Ext.Ajax.request({
            url: `${CK_API}/cattributes`,

            success: function(response, opts) {
                var obj = Ext.decode(response.responseText);
                cattributeStore.loadRawData(obj, true);
                cattributeStore.group('type');
                if (callback != null) callback();
            },

            failure: function(response, opts) {
                if (response.status == 429) // retry after 61 seconds
                    setTimeout(() => {ajaxRequest();}, waitAMin);
                else
                    console.log('server-side failure with status code ' + response.status);
            }
        });
    }
    ajaxRequest();
}

function populationCattributes(callback = null) {
    console.log("populationCattributes");
    cattributeStore = createCattributeStore();
    //createCattributesView(cattributes); // NOTE: I think the view here creates unnecessary complexity -- just read the store directly
    requestCattributes(callback);
}

Ext.define('EnhancedCattribute', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'type',        type: 'string'},
        {name: 'kittyId',     type: 'string'},
        {name: 'position',    type: 'int'},
        {name: 'description', type: 'string'}
    ]
});

// Set up a model to use in our Store
// TODO: return to sire/matron/chidlren
Ext.define('KittyFull', {
    extend: 'KittyBasic',
    fields: [
        //  {name: 'enhanced_cattributes'}
        //{name: 'children',    type: 'string'}, // object
        //{name: 'sire',    type: 'string'}, // object
        //{name: 'matron',    type: 'string'}, // object
    ],
    hasOne: [{
        model: 'AuctionBasic',
        name: 'auction'
    }],
    hasMany: [{
        model: 'EnhancedCattribute',
        name: 'enhanced_cattributes'
    }]
});

function buildKittyEra(start, end, callback = null) {
    kittyEraStore = createKittyEraStore();
    requestKittyEra(kittyEraStore, start, end, callback);
}

function createKittyEraStore() {
    return Ext.create('Ext.data.Store', {
        model: 'KittyFull',
        autoLoad: false,
        proxy: {
            type: 'ajax',
            reader: {
                type: 'json',
                root: (d) => d // no root
            }
        }
    });
}

function requestKittyEra(store, start, end, callback = null) {
    // enforce datatypes...
    start = parseInt(start);
    end = parseInt(end);

    function ajaxRequest(id) {
        Ext.Ajax.request({
            url: `${CK_API}/kitties/${id}`,

            success: function(response, opts) {
                var obj = Ext.decode(response.responseText);
                store.loadRawData(obj, true);
                if (id == end) {
                    //store.group('type');
                    if (callback != null) callback();
                    return;
                }
                // else still more data
                setTimeout(()=> {ajaxRequest(id+1);}, briefWait);
            },

            failure: function(response, opts) {
                if (response.status == 429) // retry after 61 seconds
                    setTimeout(() => {ajaxRequest(id);}, waitAMin);
                else
                    console.log('server-side failure with status code ' + response.status);
            }
        });
    }
    ajaxRequest(start);
}