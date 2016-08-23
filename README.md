# otto-pathfinder
With OTTO Pathfinder we invented a great tool which offers the ability to interactively analyze paths.


# Requirements
Web Server
MongoDb
Node.js


# Installation
1. Upload all files to the server 
2. Adjust config.json
3. Install modules
4. sudo npm install forever -g
5. sudo forever start sankey.js
6. Access OTTO Pathfinder at http://<server-ip>:<port>


# MongoDB structure
Each Sankey diagram is stored as a collection in MongoDB. Each collection contains several paths as well as metadata:


# Sample json Structure representing one path:
{
    "p-1" : { /*Step -1*/
        "PC" : "Einstiegsseite", /*Hierarchy 1; e.g. Page type*/
        "N1" : "herrenmode", /*Hierarchy 2; e.g. Page name*/
        "N2" : "Einstiegsseite", /*Hierarchy 3*/
        "N3" : "Einstiegsseite" /*Hierarchy 4*/
    },
    "p0" : { /*Step 0*/
        "PC" : "Pagetype", /*Hierarchy 1; e.g. Page type*/
        "N1" : "Pagename", /*Hierarchy 2; e.g. Page name*/
        "N2" : "hierarchie_level3", /*Hierarchy 3*/
        "N3" : "hierarchie_level4" /*Hierarchy 4*/
    },
    "p1" : { /*Step 1*/
        "PC" : "Einstiegsseite", /*Hierarchy 1; e.g. Page type*/
        "N1" : "herrenmode", /*Hierarchy 2; e.g. Page name*/
        "N2" : "Einstiegsseite", /*Hierarchy 3*/
        "N3" : "Einstiegsseite" /*Hierarchy 4*/
    },
    "p2" : { /*Step 2*/
        "PC" : "Produktliste", /*Hierarchy 1; e.g. Page type*/
        "N1" : "herrenmode", /*Hierarchy 2; e.g. Page name*/
        "N2" : "kategorien", /*Hierarchy 3*/
        "N3" : "hosen" /*Hierarchy 4*/
    },
    "p3" : { /*Exit-Step*/
        "PC" : "#exit",
        "N1" : "exit",
        "N2" : "exit",
        "N3" : "exit"
    },
    /*Filter variables*/
    "device" : "mobile",
    "marketingchannel" : "SEA",
    "ordervalue" : 5.99,
    "date" : ISODate("2016-08-23T12:00:00.000Z"),
    "count" : 1 /*Number of paths with this structure*/
}

# Sample json Structure representing metadata:
{
    "metadata" : {
        "date" : {
            "min" : "2016-06-26T12:00:00.000Z", /*Minimum date available*/
            "max" : "2016-07-08T12:00:00.000Z", /*Maximum date available*/
            "start" : "2016-07-08T12:00:00.000Z",  /*Preselected start date*/
            "end" : "2016-07-08T12:00:00.000Z"  /*Preselected end date*/
        },
        "steps" : {
            "min" : -7,  /*Minimum step available*/
            "max" : 7,  /*Maximum date available*/
            "start" : -3, /*Preselected start step*/
            "end" : 3 /*Preselected end step*/
        },
        "meta" : {
            "owner" : "Sales",  /*Owner of the current Sankey diagram; e.g. department*/
            "description" : "This sankey shows the paths that visitors of otto.de go.",
            "created" : "2016-08-23T12:00:00.000Z"
        },
        "sum" : { /*Field which can be summarized in the frontend. "count" is standard. */
            "count" : "Number of paths",
            "ordervalue" : "Order value in EUR"
        },
        "info" : {  /*Variables that are shown in tooltip*/
            "size" : "Gerätegröße"
        },
        "filter" : [ 
            {
                "label" : "Gerätegröße",
                "type" : "multilist",
                "field" : "device",
                "default" : false,
                "required" : false,
                "variant" : [ 
                    {
                        "label" : "S",
                        "value" : "S"
                    }, 
                    {
                        "label" : "M",
                        "value" : "M"
                    }, 
                    {
                        "label" : "L",
                        "value" : "L"
                    }, 
                    {
                        "label" : "XL",
                        "value" : "XL"
                    }
                ]
            }, 
            {
                "label" : "Marketing Channel",
                "type" : "multilist",
                "field" : "marketingchannel",
                "default" : false,
                "required" : false,
                "variant" : [ 
                    {
                        "label" : "SEA",
                        "value" : "SEA"
                    }, 
                    {
                        "label" : "SEO",
                        "value" : "SEO"
                    }
                ]
            }
        ]
    }
}
