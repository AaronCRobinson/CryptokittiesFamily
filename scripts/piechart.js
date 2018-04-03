// content = [{label:..., value:..., color:...}]

function generatePieChart(domId, title, content, callbacks=null, subtitle="") {
    var config = {
        "header": {
            "title": {
                "text": title,
                "fontSize": 20,
                "font": "open sans"
            },
            "subtitle": {
                "text": subtitle,
                "color": "#333333",
                //"color": "#999999",
                "fontSize": 20,
                "font": "open sans"
            },
            "titleSubtitlePadding": 2,
            "location": "pie-center"
        },
        "footer": {
            "color": "#999999",
            "fontSize": 10,
            "font": "open sans",
            "location": "bottom-left"
        },
        "size": {
            "canvasWidth": 450,
            "canvasHeight": 450,
            "pieInnerRadius": "50%",
            "pieOuterRadius": "70%"
        },
        "data": {
            "sortOrder": "value-desc",
            //"sortOrder": "label-desc",
            "content": content
        },
        "labels": {
            "outer": {
                "pieDistance": 15,
                //"format": "label-percentage1"
            },
            "inner": {
                "hideWhenLessThanPercentage": 3
            },
            "mainLabel": {
                "fontSize": 11
            },
            "percentage": {
                "color": "#ffffff",
                "fontSize": 10,
                "decimalPlaces": 0
            },
            "value": {
                "color": "#adadad",
                "fontSize": 11
            },
            "lines": {
                "enabled": true,
                "style": "straight"
            },
            "truncation": {
                "enabled": true
            }
        },
        "effects": {
            "pullOutSegmentOnClick": {
                "effect": "linear",
                "speed": 400,
                "size": 8
            }
        },
        "misc": {
            "gradient": {
                "enabled": true,
                "percentage": 100
            }
        }
    };

    // NOTE: assuming object/dictionary/map
    if (callbacks != null && Object.keys(callbacks).length > 0) {
        config['callbacks'] = {};
        for (var cb in callbacks) {
            // necessary because an object's prototype contains additional properties
            if (callbacks.hasOwnProperty(cb))
                config['callbacks'][cb] = callbacks[cb];
        }
    }

    return new d3pie(domId, config);
}