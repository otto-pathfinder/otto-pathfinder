
![alt tag](https://raw.githubusercontent.com/otto-pathfinder/otto-pathfinder/master/pathfinder.png)


# otto-pathfinder
With OTTO Pathfinder we invented a great tool which offers the ability to interactively analyze paths.

![screenshot1](https://cloud.githubusercontent.com/assets/21034961/21355184/4fac1522-c6cd-11e6-9ee2-e8dcd6914c9f.PNG)

The user has the possibility to filter paths, to drill certain nodes up to three levels of detail (e.g. from the assortment to the product or from page types to ever finer page names), to select the number of the displayed steps within the journey, to display only the paths of visitors of specific marketing channels and many more options.

![screenshot2](https://cloud.githubusercontent.com/assets/21034961/21355191/59b20734-c6cd-11e6-8ed3-09a3291079e4.PNG)

Not only the absolute, but also the percentage occurrences of the paths are displayed (share of the current view, not share of total).

![screenshot](https://cloud.githubusercontent.com/assets/21034961/21355196/5f446200-c6cd-11e6-94f7-30394b9dd357.PNG)

It is now possible to save different views (drilldowns and filters) in the webbrowser and reload them later.

![screenshot4](https://cloud.githubusercontent.com/assets/21034961/21355457/5c119aa2-c6ce-11e6-8e70-9409c75f9e84.PNG)

A view that has been saved in the browser previously can be reloaded via the "Load Sankey" function. Here the stored drilldowns and filters are applied to the current data of the Sankey database.

# Requirements
Web Server
MongoDB
Node.js


# Installation
1. Upload all files to the server 
2. Navigate to OTTO Pathfinder folder
3. Adjust config.json
4. sudo npm install
5. sudo npm install forever -g
6. sudo forever start sankey.js
7. Access OTTO Pathfinder at http://\<server-ip\>:\<port\>


# MongoDB structure
Each Sankey diagram is stored as a collection in MongoDB. Each collection contains several paths as well as metadata:


# Sample json Structure representing one path:
```
{
    "p-1" : { /*Step -1*/
        "PC" : "Entrysite", /*Hierarchy 1; e.g. Page type*/
        "N1" : "herrenmode", /*Hierarchy 2; e.g. Page name*/
        "N2" : "Entrysite", /*Hierarchy 3*/
        "N3" : "Entrysite" /*Hierarchy 4*/
    },
    "p0" : { /*Step 0*/
        "PC" : "Storefront", /*Hierarchy 1; e.g. Page type*/
        "N1" : "homepage", /*Hierarchy 2; e.g. Page name*/
        "N2" : "hierarchie_level3", /*Hierarchy 3*/
        "N3" : "hierarchie_level4" /*Hierarchy 4*/
    },
    "p1" : { /*Step 1*/
        "PC" : "Entrysite", /*Hierarchy 1; e.g. Page type*/
        "N1" : "herrenmode", /*Hierarchy 2; e.g. Page name*/
        "N2" : "Entrysite", /*Hierarchy 3*/
        "N3" : "Entrysite" /*Hierarchy 4*/
    },
    "p2" : { /*Step 2*/
        "PC" : "Entrysite", /*Hierarchy 1; e.g. Page type*/
        "N1" : "herrenmode", /*Hierarchy 2; e.g. Page name*/
        "N2" : "shirts", /*Hierarchy 3*/
        "N3" : "Entrysite" /*Hierarchy 4*/
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
```


# Sample json Structure representing metadata:
```
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
            "size" : "Screen size"
        },
        "filter" : [ 
            {
                "label" : "Screen size",
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
```

# Third party licence 
- Material Design Icons (CC-BY 4.0) https://design.google.com/icons/ 
- ClearSans (Apache 2.0 License) https://01.org/clear-SANS 
- Many thanks to Mike Bostock (https://bost.ocks.org/mike/sankey/), whose Sankey library provided basic code and inspiration.
