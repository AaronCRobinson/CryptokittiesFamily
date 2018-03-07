var CK_API = "https://api.cryptokitties.co";

// Set up a model to use in our Store
Ext.define('Kitty', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'id',            type: 'int'},
        {name: 'name',          type: 'string'},
        {name: 'image_url',     type: 'string'},
        {name: 'image_url_cdn', type: 'string'},
        {name: 'generation',    type: 'int'},
        {name: 'image_url',     type: 'string'},
        {name: 'created_at',    type: 'string'},
        {name: 'color',         type: 'string'},
        {name: 'is_fancy',      type: 'bool'},
        {name: 'is_exclusive',  type: 'bool'},
        {name: 'fancy_type',    type: 'string'},
        //{name: 'status',    type: 'string'}, // object
        //{name: 'purrs',    type: 'string'},
        //{name: 'watchlist',    type: 'string'},
        {name: 'hatched',       type: 'bool'},
        //{name: 'auction',    type: 'string'}, // object
        //{name: 'owner',    type: 'string'}, // object
        //{name: 'sire',    type: 'string'}, // object
        //{name: 'matron',    type: 'string'}, // object
    ]
});


function createPlayerKittiesStore() {
    return Ext.create('Ext.data.Store', {
        model: 'Kitty',
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
            '<div style="margin-bottom: 10px;" class="thumb-wrap">',
            '{id} - {name}',
                '<img class="largeThumbNail" src="{image_url}">',
            '</div>',
        '</tpl>'
    );

    return Ext.create('Ext.view.View', {
        store: store,
        tpl: kittyTpl,
        itemSelector: 'div.thumb-wrap',
        emptyText: 'No images available',
        renderTo: Ext.get('player-kitties')
    });
}

function requestPlayerKitties(addr, offset, limit=20, parents=false) {
    console.log(`${CK_API}/kitties?offset=${offset}&limit=${limit}&owner_wallet_address=${addr}&parents=${parents}`);
    Ext.Ajax.request({
        url: `${CK_API}/kitties?offset=${offset}&limit=${limit}&owner_wallet_address=${addr}&parents=${parents}`,

        success: function(response, opts) {
            var obj = Ext.decode(response.responseText);
            playerKitties.loadRawData(obj, true);
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
    //playerKitties.clear();
    playerKitties = createPlayerKittiesStore();
    createPlayerKittiesView(playerKitties);
    requestPlayerKitties(addr.toLowerCase(), 0);
}

//populationPlayerKitties("0xcb187babff22a47f59cfad0439b9d655fc9070dd");