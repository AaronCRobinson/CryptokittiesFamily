
// TODO: consider a class? (haha who uses classes in javascript)
var buteMap = {};
function initSearchParser() {
    // build map object from cattributes api
    populationCattributes(() => {
        var dataTypeMaps = {
            'colorprimary' : 'bodycolor',
            'colorsecondary': 'patterncolor', //'secondarycolor',
            'colortertiary': 'secondarycolor', //'patterncolor',
            'eyes': 'eyetype',
            'coloreyes': 'eyecolor',
        };
        var MapType = (s) => s in dataTypeMaps ? dataTypeMaps[s] : s;
        var Ucfirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);
        cattributeStore.getData().items.forEach( (bute) => {
            var data = bute.getData();
            buteMap[data.description] = `kitty.getGenes().get${Ucfirst(MapType(data.type))}().getData().D0=="${data.description}"`;
        });
        //console.log(buteMap);
    });
}

// TODO: var genes = kitty.getGenes();

multiValueReplaceMap = {
    " and ":"&",
    " or ":"|",
    "=": "==",
    ":": "=="
};

function parseSearchQuery(s) {
    var depth = 0;

    // preprocess
    //https://stackoverflow.com/questions/15604140/replace-multiple-strings-with-multiple-other-strings?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
    var mapObj
    var query = s.toLowerCase().replace(/ and | or |=|:/gi,  (m) => multiValueReplaceMap[m]);

    // split into logic parts
    query = query.split(/(<=|>=|==|[><()&|, ])/);

    console.log(query);

    // TODO: are you using this?
    var calc = [];
    var func = null;

    var funcStr = "";
    function appendFuncStr(s, prefix="&&") {
        if (funcStr.length == 0)
            return funcStr += `${s}`;
        return funcStr += `${prefix}${s}`;
    }

    // NOTE: passing array and idx to allow changing of the referenced value in array
    function generateStmt(query, i) {
        var val = query[i];
        // first check buteMap
        if (val in buteMap)
        {
            query[i] = buteMap[val];
            return true;
        }

        switch (val) {
            //case ""
            case "gen":
                query[i] = "kitty.getData().generation";
                break;
            case "cooldown":
                query[i] = "kitty.getData().status.cooldown_index";
                break;
            //case "type":
            //case "id":
            //default:
        }
        return false;
    }

    function generateHiddenStmt(query, i) {
        var newIdx = i+1;
        while (!/\S/.test(query[newIdx]) || query[newIdx] == '==')
            newIdx++;
        appendFuncStr(`${buteMap[query[newIdx]].replace('D0',query[i].toUpperCase())}`);
        return newIdx;
    }

    // TODO: return to parens

    // ASSUME: no extra parens
    // ASSUME: compares flanked by values
    for (i = 0; i < query.length; i++) {
        if (query[i].length == 0) return; // short circut
        switch(query[i]) {
            case "=<":
            case "<":
            case ">=":
            case ">":
            case "==":
                appendFuncStr(`${query[i-1]}${query[i]}${query[i+1]}`);
                break;
            case "&":
            case "|":
                appendFuncStr(`${query[i]}${query[i]}`);
                break;
            // treating hidden as operators
            case "h1":
            case "h2":
            case "h3":
                query[i] = `r${query[i].slice(1)}`;
            case "r1":
            case "r2":
            case "r3":
                i=generateHiddenStmt(query,i);
                break;
            case "(":
                depth++;
                // store cur func
                calc.push(func);
                func = null;
                break;
            case ")":
                depth--;
                // TODO: consume
                func = calc.pop();
                break;
            default:
                // nothing for now
                if (generateStmt(query, i)) // isBute
                    appendFuncStr(`${query[i]}`);
                break;

        }
    }

    //if (depth!=0) => error
    console.log(funcStr);
    return new Function('kitty', `junk=kitty; return ${funcStr};`);
}