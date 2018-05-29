(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Neo4jd3 = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
'use strict';

var neo4jd3 = _dereq_('./scripts/neo4jd3');

module.exports = neo4jd3;

},{"./scripts/neo4jd3":2}],2:[function(_dereq_,module,exports){
/* global d3, document */
/* jshint latedef:nofunc */
'use strict';

function Neo4jD3(_selector, _options) {
    var container, graph, info, node, nodes, relationship, relationshipOutline, relationshipOverlay, relationshipText, relationships, selector, simulation, svg, svgNodes, svgRelationships, svgScale, svgTranslate,
        classes2colors = {},
        justLoaded = false,
        numClasses = 0,
        options = {
            arrowSize: 4,
            colors: colors(),
            highlight: undefined,
            iconMap: fontAwesomeIcons(),
            icons: undefined,
            imageMap: {},
            images: undefined,
            infoPanel: true,
            minCollision: undefined,
            neo4jData: undefined,
            neo4jDataUrl: undefined,
            nodeOutlineFillColor: undefined,
            nodeRadius: 25,
            relationshipColor: '#a5abb6',
            zoomFit: false,
            velocityDecay: 0.4,
            alphaDecay: 0.0228
        },
        VERSION = '0.0.1';

    function appendGraph(container) {
        svg = container.append('svg')
                       .attr('width', '100%')
                       .attr('height', '100%')
                       .attr('class', 'neo4jd3-graph')
                       .call(d3.zoom().on('zoom', function() {
                           var scale = d3.event.transform.k,
                               translate = [d3.event.transform.x, d3.event.transform.y];

                           if (svgTranslate) {
                               translate[0] += svgTranslate[0];
                               translate[1] += svgTranslate[1];
                           }

                           if (svgScale) {
                               scale *= svgScale;
                           }

                           svg.attr('transform', 'translate(' + translate[0] + ', ' + translate[1] + ') scale(' + scale + ')');
                       }))
                       .on('dblclick.zoom', null)
                       .append('g')
                       .attr('width', '100%')
                       .attr('height', '100%');

        svgRelationships = svg.append('g')
                              .attr('class', 'relationships');

        svgNodes = svg.append('g')
                      .attr('class', 'nodes');
    }

    function appendImageToNode(node) {
        return node.append('image')
                   .attr('height', function(d) {
                       return icon(d) ? '24px': '30px';
                   })
                   .attr('x', function(d) {
                       return icon(d) ? '5px': '-15px';
                   })
                   .attr('xlink:href', function(d) {
                       return image(d);
                   })
                   .attr('y', function(d) {
                       return icon(d) ? '5px': '-16px';
                   })
                   .attr('width', function(d) {
                       return icon(d) ? '24px': '30px';
                   });
    }

    function appendInfoPanel(container) {
        return container.append('div')
                        .attr('class', 'neo4jd3-info');
    }

    function appendInfoElement(cls, isNode, property, value) {
        var elem = info.append('a');

        elem.attr('href', '#')
            .attr('class', cls)
            .html('<strong>' + property + '</strong>' + (value ? (': ' + value) : ''));

        if (!value) {
            elem.style('background-color', function(d) {
                    return options.nodeOutlineFillColor ? options.nodeOutlineFillColor : (isNode ? class2color(property) : defaultColor());
                })
                .style('border-color', function(d) {
                    return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : (isNode ? class2darkenColor(property) : defaultDarkenColor());
                })
                .style('color', function(d) {
                    return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : '#fff';
                });
        }
    }

    function appendInfoElementClass(cls, node) {
        appendInfoElement(cls, true, node);
    }

    function appendInfoElementProperty(cls, property, value) {
        appendInfoElement(cls, false, property, value);
    }

    function appendInfoElementRelationship(cls, relationship) {
        appendInfoElement(cls, false, relationship);
    }

    function appendNode() {
        return node.enter()
                   .append('g')
                   .attr('class', function(d) {
                       var highlight, i,
                           classes = 'node',
                           label = d.labels[0];

                       if (icon(d)) {
                           classes += ' node-icon';
                       }

                       if (image(d)) {
                           classes += ' node-image';
                       }

                       if (options.highlight) {
                           for (i = 0; i < options.highlight.length; i++) {
                               highlight = options.highlight[i];

                               if (d.labels[0] === highlight.class && d.properties[highlight.property] === highlight.value) {
                                   classes += ' node-highlighted';
                                   break;
                               }
                           }
                       }

                       return classes;
                   })
                   .on('click', function(d) {
                       d.fx = d.fy = null;

                       if (typeof options.onNodeClick === 'function') {
                           options.onNodeClick(d);
                       }
                   })
                   .on('dblclick', function(d) {
                    //    stickNode(d);

                       if (typeof options.onNodeDoubleClick === 'function') {
                           options.onNodeDoubleClick(d);
                       }
                   })
                   .on('mouseenter', function(d) {
                       if (info) {
                           updateInfo(d);
                       }

                       if (typeof options.onNodeMouseEnter === 'function') {
                           options.onNodeMouseEnter(d);
                       }
                   })
                   .on('mouseleave', function(d) {
                       if (info) {
                           clearInfo(d);
                       }

                       if (typeof options.onNodeMouseLeave === 'function') {
                           options.onNodeMouseLeave(d);
                       }
                   })
                   .call(d3.drag()
                           .on('start', dragStarted)
                           .on('drag', dragged)
                           .on('end', dragEnded));
    }

    function appendNodeToGraph() {
        var n = appendNode();

        appendRingToNode(n);
        appendOutlineToNode(n);

        if (options.icons) {
            appendTextToNode(n);
        }

        if (options.images) {
            appendImageToNode(n);
        }

        return n;
    }

    function appendOutlineToNode(node) {
        return node.append('circle')
                   .attr('class', 'outline')
                   .attr('r', options.nodeRadius)
                   .style('fill', function(d) {
                       return options.nodeOutlineFillColor ? options.nodeOutlineFillColor : class2color(d.labels[0]);
                   })
                   .style('stroke', function(d) {
                       return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : class2darkenColor(d.labels[0]);
                   })
                   .append('title').text(function(d) {
                       return toString(d);
                   });
    }

    function appendRingToNode(node) {
        return node.append('circle')
                   .attr('class', 'ring')
                   .attr('r', options.nodeRadius * 1.16)
                   .append('title').text(function(d) {
                       return toString(d);
                   });
    }

    function appendTextToNode(node) {
        return node.append('text')
                   .attr('class', function(d) {
                       return 'text' + (icon(d) ? ' icon' : '');
                   })
                   .attr('fill', '#ffffff')
                   .attr('font-size', function(d) {
                       return icon(d) ? (options.nodeRadius + 'px') : '10px';
                   })
                   .attr('pointer-events', 'none')
                   .attr('text-anchor', 'middle')
                   .attr('y', function(d) {
                       return icon(d) ? (parseInt(Math.round(options.nodeRadius * 0.32)) + 'px') : '4px';
                   })
                   .html(function(d) {
                       var _icon = icon(d);
                       return _icon ? '&#x' + _icon : d.id;
                   });
    }

    function appendRandomDataToNode(d, maxNodesToGenerate) {
        var data = randomD3Data(d, maxNodesToGenerate);
        updateWithNeo4jData(data);
    }

    function appendRelationship() {
        return relationship.enter()
                           .append('g')
                           .attr('class', 'relationship')
                           .on('dblclick', function(d) {
                               if (typeof options.onRelationshipDoubleClick === 'function') {
                                   options.onRelationshipDoubleClick(d);
                               }
                           })
                           .on('mouseenter', function(d) {
                               if (info) {
                                   updateInfo(d);
                               }
                           });
    }

    function appendOutlineToRelationship(r) {
        return r.append('path')
                .attr('class', 'outline')
                .attr('fill', '#a5abb6')
                .attr('stroke', 'none');
    }

    function appendOverlayToRelationship(r) {
        return r.append('path')
                .attr('class', 'overlay');
    }

    function appendTextToRelationship(r) {
        return r.append('text')
                .attr('class', 'text')
                .attr('fill', '#000000')
                .attr('font-size', '8px')
                .attr('pointer-events', 'none')
                .attr('text-anchor', 'middle')
                .text(function(d) {
                    return d.type;
                });
    }

    function appendRelationshipToGraph() {
        var relationship = appendRelationship(),
            text = appendTextToRelationship(relationship),
            outline = appendOutlineToRelationship(relationship),
            overlay = appendOverlayToRelationship(relationship);

        return {
            outline: outline,
            overlay: overlay,
            relationship: relationship,
            text: text
        };
    }

    function class2color(cls) {
        var color = classes2colors[cls];

        if (!color) {
//            color = options.colors[Math.min(numClasses, options.colors.length - 1)];
            color = options.colors[numClasses % options.colors.length];
            classes2colors[cls] = color;
            numClasses++;
        }

        return color;
    }

    function class2darkenColor(cls) {
        return d3.rgb(class2color(cls)).darker(1);
    }

    function clearInfo() {
        info.html('');
    }

    function color() {
        return options.colors[options.colors.length * Math.random() << 0];
    }

    function colors() {
        // d3.schemeCategory10,
        // d3.schemeCategory20,
        return [
            '#68bdf6', // light blue
            '#6dce9e', // green #1
            '#faafc2', // light pink
            '#f2baf6', // purple
            '#ff928c', // light red
            '#fcea7e', // light yellow
            '#ffc766', // light orange
            '#405f9e', // navy blue
            '#a5abb6', // dark gray
            '#78cecb', // green #2,
            '#b88cbb', // dark purple
            '#ced2d9', // light gray
            '#e84646', // dark red
            '#fa5f86', // dark pink
            '#ffab1a', // dark orange
            '#fcda19', // dark yellow
            '#797b80', // black
            '#c9d96f', // pistacchio
            '#47991f', // green #3
            '#70edee', // turquoise
            '#ff75ea'  // pink
        ];
    }

    function contains(array, id) {
        var filter = array.filter(function(elem) {
            return elem.id === id;
        });

        return filter.length > 0;
    }

    function defaultColor() {
        return options.relationshipColor;
    }

    function defaultDarkenColor() {
        return d3.rgb(options.colors[options.colors.length - 1]).darker(1);
    }

    function dragEnded(d) {
        if (!d3.event.active) {
            simulation.alphaTarget(0);
        }

        if (typeof options.onNodeDragEnd === 'function') {
            options.onNodeDragEnd(d);
        }
    }

    function dragged(d) {
        stickNode(d);
    }

    function dragStarted(d) {
        if (!d3.event.active) {
            simulation.alphaTarget(0.3).restart();
        }

        d.fx = d.x;
        d.fy = d.y;

        if (typeof options.onNodeDragStart === 'function') {
            options.onNodeDragStart(d);
        }
    }

    function extend(obj1, obj2) {
        var obj = {};

        merge(obj, obj1);
        merge(obj, obj2);

        return obj;
    }

    function fontAwesomeIcons() {
        // return {'glass':'f000','music':'f001','search':'f002','envelope-o':'f003','heart':'f004','star':'f005','star-o':'f006','user':'f007','film':'f008','th-large':'f009','th':'f00a','th-list':'f00b','check':'f00c','remove,close,times':'f00d','search-plus':'f00e','search-minus':'f010','power-off':'f011','signal':'f012','gear,cog':'f013','trash-o':'f014','home':'f015','file-o':'f016','clock-o':'f017','road':'f018','download':'f019','arrow-circle-o-down':'f01a','arrow-circle-o-up':'f01b','inbox':'f01c','play-circle-o':'f01d','rotate-right,repeat':'f01e','refresh':'f021','list-alt':'f022','lock':'f023','flag':'f024','headphones':'f025','volume-off':'f026','volume-down':'f027','volume-up':'f028','qrcode':'f029','barcode':'f02a','tag':'f02b','tags':'f02c','book':'f02d','bookmark':'f02e','print':'f02f','camera':'f030','font':'f031','bold':'f032','italic':'f033','text-height':'f034','text-width':'f035','align-left':'f036','align-center':'f037','align-right':'f038','align-justify':'f039','list':'f03a','dedent,outdent':'f03b','indent':'f03c','video-camera':'f03d','photo,image,picture-o':'f03e','pencil':'f040','map-marker':'f041','adjust':'f042','tint':'f043','edit,pencil-square-o':'f044','share-square-o':'f045','check-square-o':'f046','arrows':'f047','step-backward':'f048','fast-backward':'f049','backward':'f04a','play':'f04b','pause':'f04c','stop':'f04d','forward':'f04e','fast-forward':'f050','step-forward':'f051','eject':'f052','chevron-left':'f053','chevron-right':'f054','plus-circle':'f055','minus-circle':'f056','times-circle':'f057','check-circle':'f058','question-circle':'f059','info-circle':'f05a','crosshairs':'f05b','times-circle-o':'f05c','check-circle-o':'f05d','ban':'f05e','arrow-left':'f060','arrow-right':'f061','arrow-up':'f062','arrow-down':'f063','mail-forward,share':'f064','expand':'f065','compress':'f066','plus':'f067','minus':'f068','asterisk':'f069','exclamation-circle':'f06a','gift':'f06b','leaf':'f06c','fire':'f06d','eye':'f06e','eye-slash':'f070','warning,exclamation-triangle':'f071','plane':'f072','calendar':'f073','random':'f074','comment':'f075','magnet':'f076','chevron-up':'f077','chevron-down':'f078','retweet':'f079','shopping-cart':'f07a','folder':'f07b','folder-open':'f07c','arrows-v':'f07d','arrows-h':'f07e','bar-chart-o,bar-chart':'f080','twitter-square':'f081','facebook-square':'f082','camera-retro':'f083','key':'f084','gears,cogs':'f085','comments':'f086','thumbs-o-up':'f087','thumbs-o-down':'f088','star-half':'f089','heart-o':'f08a','sign-out':'f08b','linkedin-square':'f08c','thumb-tack':'f08d','external-link':'f08e','sign-in':'f090','trophy':'f091','github-square':'f092','upload':'f093','lemon-o':'f094','phone':'f095','square-o':'f096','bookmark-o':'f097','phone-square':'f098','twitter':'f099','facebook-f,facebook':'f09a','github':'f09b','unlock':'f09c','credit-card':'f09d','feed,rss':'f09e','hdd-o':'f0a0','bullhorn':'f0a1','bell':'f0f3','certificate':'f0a3','hand-o-right':'f0a4','hand-o-left':'f0a5','hand-o-up':'f0a6','hand-o-down':'f0a7','arrow-circle-left':'f0a8','arrow-circle-right':'f0a9','arrow-circle-up':'f0aa','arrow-circle-down':'f0ab','globe':'f0ac','wrench':'f0ad','tasks':'f0ae','filter':'f0b0','briefcase':'f0b1','arrows-alt':'f0b2','group,users':'f0c0','chain,link':'f0c1','cloud':'f0c2','flask':'f0c3','cut,scissors':'f0c4','copy,files-o':'f0c5','paperclip':'f0c6','save,floppy-o':'f0c7','square':'f0c8','navicon,reorder,bars':'f0c9','list-ul':'f0ca','list-ol':'f0cb','strikethrough':'f0cc','underline':'f0cd','table':'f0ce','magic':'f0d0','truck':'f0d1','pinterest':'f0d2','pinterest-square':'f0d3','google-plus-square':'f0d4','google-plus':'f0d5','money':'f0d6','caret-down':'f0d7','caret-up':'f0d8','caret-left':'f0d9','caret-right':'f0da','columns':'f0db','unsorted,sort':'f0dc','sort-down,sort-desc':'f0dd','sort-up,sort-asc':'f0de','envelope':'f0e0','linkedin':'f0e1','rotate-left,undo':'f0e2','legal,gavel':'f0e3','dashboard,tachometer':'f0e4','comment-o':'f0e5','comments-o':'f0e6','flash,bolt':'f0e7','sitemap':'f0e8','umbrella':'f0e9','paste,clipboard':'f0ea','lightbulb-o':'f0eb','exchange':'f0ec','cloud-download':'f0ed','cloud-upload':'f0ee','user-md':'f0f0','stethoscope':'f0f1','suitcase':'f0f2','bell-o':'f0a2','coffee':'f0f4','cutlery':'f0f5','file-text-o':'f0f6','building-o':'f0f7','hospital-o':'f0f8','ambulance':'f0f9','medkit':'f0fa','fighter-jet':'f0fb','beer':'f0fc','h-square':'f0fd','plus-square':'f0fe','angle-double-left':'f100','angle-double-right':'f101','angle-double-up':'f102','angle-double-down':'f103','angle-left':'f104','angle-right':'f105','angle-up':'f106','angle-down':'f107','desktop':'f108','laptop':'f109','tablet':'f10a','mobile-phone,mobile':'f10b','circle-o':'f10c','quote-left':'f10d','quote-right':'f10e','spinner':'f110','circle':'f111','mail-reply,reply':'f112','github-alt':'f113','folder-o':'f114','folder-open-o':'f115','smile-o':'f118','frown-o':'f119','meh-o':'f11a','gamepad':'f11b','keyboard-o':'f11c','flag-o':'f11d','flag-checkered':'f11e','terminal':'f120','code':'f121','mail-reply-all,reply-all':'f122','star-half-empty,star-half-full,star-half-o':'f123','location-arrow':'f124','crop':'f125','code-fork':'f126','unlink,chain-broken':'f127','question':'f128','info':'f129','exclamation':'f12a','superscript':'f12b','subscript':'f12c','eraser':'f12d','puzzle-piece':'f12e','microphone':'f130','microphone-slash':'f131','shield':'f132','calendar-o':'f133','fire-extinguisher':'f134','rocket':'f135','maxcdn':'f136','chevron-circle-left':'f137','chevron-circle-right':'f138','chevron-circle-up':'f139','chevron-circle-down':'f13a','html5':'f13b','css3':'f13c','anchor':'f13d','unlock-alt':'f13e','bullseye':'f140','ellipsis-h':'f141','ellipsis-v':'f142','rss-square':'f143','play-circle':'f144','ticket':'f145','minus-square':'f146','minus-square-o':'f147','level-up':'f148','level-down':'f149','check-square':'f14a','pencil-square':'f14b','external-link-square':'f14c','share-square':'f14d','compass':'f14e','toggle-down,caret-square-o-down':'f150','toggle-up,caret-square-o-up':'f151','toggle-right,caret-square-o-right':'f152','euro,eur':'f153','gbp':'f154','dollar,usd':'f155','rupee,inr':'f156','cny,rmb,yen,jpy':'f157','ruble,rouble,rub':'f158','won,krw':'f159','bitcoin,btc':'f15a','file':'f15b','file-text':'f15c','sort-alpha-asc':'f15d','sort-alpha-desc':'f15e','sort-amount-asc':'f160','sort-amount-desc':'f161','sort-numeric-asc':'f162','sort-numeric-desc':'f163','thumbs-up':'f164','thumbs-down':'f165','youtube-square':'f166','youtube':'f167','xing':'f168','xing-square':'f169','youtube-play':'f16a','dropbox':'f16b','stack-overflow':'f16c','instagram':'f16d','flickr':'f16e','adn':'f170','bitbucket':'f171','bitbucket-square':'f172','tumblr':'f173','tumblr-square':'f174','long-arrow-down':'f175','long-arrow-up':'f176','long-arrow-left':'f177','long-arrow-right':'f178','apple':'f179','windows':'f17a','android':'f17b','linux':'f17c','dribbble':'f17d','skype':'f17e','foursquare':'f180','trello':'f181','female':'f182','male':'f183','gittip,gratipay':'f184','sun-o':'f185','moon-o':'f186','archive':'f187','bug':'f188','vk':'f189','weibo':'f18a','renren':'f18b','pagelines':'f18c','stack-exchange':'f18d','arrow-circle-o-right':'f18e','arrow-circle-o-left':'f190','toggle-left,caret-square-o-left':'f191','dot-circle-o':'f192','wheelchair':'f193','vimeo-square':'f194','turkish-lira,try':'f195','plus-square-o':'f196','space-shuttle':'f197','slack':'f198','envelope-square':'f199','wordpress':'f19a','openid':'f19b','institution,bank,university':'f19c','mortar-board,graduation-cap':'f19d','yahoo':'f19e','google':'f1a0','reddit':'f1a1','reddit-square':'f1a2','stumbleupon-circle':'f1a3','stumbleupon':'f1a4','delicious':'f1a5','digg':'f1a6','pied-piper-pp':'f1a7','pied-piper-alt':'f1a8','drupal':'f1a9','joomla':'f1aa','language':'f1ab','fax':'f1ac','building':'f1ad','child':'f1ae','paw':'f1b0','spoon':'f1b1','cube':'f1b2','cubes':'f1b3','behance':'f1b4','behance-square':'f1b5','steam':'f1b6','steam-square':'f1b7','recycle':'f1b8','automobile,car':'f1b9','cab,taxi':'f1ba','tree':'f1bb','spotify':'f1bc','deviantart':'f1bd','soundcloud':'f1be','database':'f1c0','file-pdf-o':'f1c1','file-word-o':'f1c2','file-excel-o':'f1c3','file-powerpoint-o':'f1c4','file-photo-o,file-picture-o,file-image-o':'f1c5','file-zip-o,file-archive-o':'f1c6','file-sound-o,file-audio-o':'f1c7','file-movie-o,file-video-o':'f1c8','file-code-o':'f1c9','vine':'f1ca','codepen':'f1cb','jsfiddle':'f1cc','life-bouy,life-buoy,life-saver,support,life-ring':'f1cd','circle-o-notch':'f1ce','ra,resistance,rebel':'f1d0','ge,empire':'f1d1','git-square':'f1d2','git':'f1d3','y-combinator-square,yc-square,hacker-news':'f1d4','tencent-weibo':'f1d5','qq':'f1d6','wechat,weixin':'f1d7','send,paper-plane':'f1d8','send-o,paper-plane-o':'f1d9','history':'f1da','circle-thin':'f1db','header':'f1dc','paragraph':'f1dd','sliders':'f1de','share-alt':'f1e0','share-alt-square':'f1e1','bomb':'f1e2','soccer-ball-o,futbol-o':'f1e3','tty':'f1e4','binoculars':'f1e5','plug':'f1e6','slideshare':'f1e7','twitch':'f1e8','yelp':'f1e9','newspaper-o':'f1ea','wifi':'f1eb','calculator':'f1ec','paypal':'f1ed','google-wallet':'f1ee','cc-visa':'f1f0','cc-mastercard':'f1f1','cc-discover':'f1f2','cc-amex':'f1f3','cc-paypal':'f1f4','cc-stripe':'f1f5','bell-slash':'f1f6','bell-slash-o':'f1f7','trash':'f1f8','copyright':'f1f9','at':'f1fa','eyedropper':'f1fb','paint-brush':'f1fc','birthday-cake':'f1fd','area-chart':'f1fe','pie-chart':'f200','line-chart':'f201','lastfm':'f202','lastfm-square':'f203','toggle-off':'f204','toggle-on':'f205','bicycle':'f206','bus':'f207','ioxhost':'f208','angellist':'f209','cc':'f20a','shekel,sheqel,ils':'f20b','meanpath':'f20c','buysellads':'f20d','connectdevelop':'f20e','dashcube':'f210','forumbee':'f211','leanpub':'f212','sellsy':'f213','shirtsinbulk':'f214','simplybuilt':'f215','skyatlas':'f216','cart-plus':'f217','cart-arrow-down':'f218','diamond':'f219','ship':'f21a','user-secret':'f21b','motorcycle':'f21c','street-view':'f21d','heartbeat':'f21e','venus':'f221','mars':'f222','mercury':'f223','intersex,transgender':'f224','transgender-alt':'f225','venus-double':'f226','mars-double':'f227','venus-mars':'f228','mars-stroke':'f229','mars-stroke-v':'f22a','mars-stroke-h':'f22b','neuter':'f22c','genderless':'f22d','facebook-official':'f230','pinterest-p':'f231','whatsapp':'f232','server':'f233','user-plus':'f234','user-times':'f235','hotel,bed':'f236','viacoin':'f237','train':'f238','subway':'f239','medium':'f23a','yc,y-combinator':'f23b','optin-monster':'f23c','opencart':'f23d','expeditedssl':'f23e','battery-4,battery-full':'f240','battery-3,battery-three-quarters':'f241','battery-2,battery-half':'f242','battery-1,battery-quarter':'f243','battery-0,battery-empty':'f244','mouse-pointer':'f245','i-cursor':'f246','object-group':'f247','object-ungroup':'f248','sticky-note':'f249','sticky-note-o':'f24a','cc-jcb':'f24b','cc-diners-club':'f24c','clone':'f24d','balance-scale':'f24e','hourglass-o':'f250','hourglass-1,hourglass-start':'f251','hourglass-2,hourglass-half':'f252','hourglass-3,hourglass-end':'f253','hourglass':'f254','hand-grab-o,hand-rock-o':'f255','hand-stop-o,hand-paper-o':'f256','hand-scissors-o':'f257','hand-lizard-o':'f258','hand-spock-o':'f259','hand-pointer-o':'f25a','hand-peace-o':'f25b','trademark':'f25c','registered':'f25d','creative-commons':'f25e','gg':'f260','gg-circle':'f261','tripadvisor':'f262','odnoklassniki':'f263','odnoklassniki-square':'f264','get-pocket':'f265','wikipedia-w':'f266','safari':'f267','chrome':'f268','firefox':'f269','opera':'f26a','internet-explorer':'f26b','tv,television':'f26c','contao':'f26d','500px':'f26e','amazon':'f270','calendar-plus-o':'f271','calendar-minus-o':'f272','calendar-times-o':'f273','calendar-check-o':'f274','industry':'f275','map-pin':'f276','map-signs':'f277','map-o':'f278','map':'f279','commenting':'f27a','commenting-o':'f27b','houzz':'f27c','vimeo':'f27d','black-tie':'f27e','fonticons':'f280','reddit-alien':'f281','edge':'f282','credit-card-alt':'f283','codiepie':'f284','modx':'f285','fort-awesome':'f286','usb':'f287','product-hunt':'f288','mixcloud':'f289','scribd':'f28a','pause-circle':'f28b','pause-circle-o':'f28c','stop-circle':'f28d','stop-circle-o':'f28e','shopping-bag':'f290','shopping-basket':'f291','hashtag':'f292','bluetooth':'f293','bluetooth-b':'f294','percent':'f295','gitlab':'f296','wpbeginner':'f297','wpforms':'f298','envira':'f299','universal-access':'f29a','wheelchair-alt':'f29b','question-circle-o':'f29c','blind':'f29d','audio-description':'f29e','volume-control-phone':'f2a0','braille':'f2a1','assistive-listening-systems':'f2a2','asl-interpreting,american-sign-language-interpreting':'f2a3','deafness,hard-of-hearing,deaf':'f2a4','glide':'f2a5','glide-g':'f2a6','signing,sign-language':'f2a7','low-vision':'f2a8','viadeo':'f2a9','viadeo-square':'f2aa','snapchat':'f2ab','snapchat-ghost':'f2ac','snapchat-square':'f2ad','pied-piper':'f2ae','first-order':'f2b0','yoast':'f2b1','themeisle':'f2b2','google-plus-circle,google-plus-official':'f2b3','fa,font-awesome':'f2b4'};
        return {};
    }

    function icon(d) {
        var code;

        if (options.iconMap && options.showIcons && options.icons) {
            if (options.icons[d.labels[0]] && options.iconMap[options.icons[d.labels[0]]]) {
                code = options.iconMap[options.icons[d.labels[0]]];
            } else if (options.iconMap[d.labels[0]]) {
                code = options.iconMap[d.labels[0]];
            } else if (options.icons[d.labels[0]]) {
                code = options.icons[d.labels[0]];
            }
        }

        return code;
    }

    function image(d) {
        var i, imagesForLabel, img, imgLevel, label, labelPropertyValue, property, value;

        if (options.images) {
            imagesForLabel = options.imageMap[d.labels[0]];

            if (imagesForLabel) {
                imgLevel = 0;

                for (i = 0; i < imagesForLabel.length; i++) {
                    labelPropertyValue = imagesForLabel[i].split('|');

                    switch (labelPropertyValue.length) {
                        case 3:
                        value = labelPropertyValue[2];
                        /* falls through */
                        case 2:
                        property = labelPropertyValue[1];
                        /* falls through */
                        case 1:
                        label = labelPropertyValue[0];
                    }

                    if (d.labels[0] === label &&
                        (!property || d.properties[property] !== undefined) &&
                        (!value || d.properties[property] === value)) {
                        if (labelPropertyValue.length > imgLevel) {
                            img = options.images[imagesForLabel[i]];
                            imgLevel = labelPropertyValue.length;
                        }
                    }
                }
            }
        }

        return img;
    }

    function init(_selector, _options) {
        initIconMap();

        merge(options, _options);

        if (options.icons) {
            options.showIcons = true;
        }

        if (!options.minCollision) {
            options.minCollision = options.nodeRadius * 2;
        }

        initImageMap();

        selector = _selector;

        container = d3.select(selector);

        container.attr('class', 'neo4jd3')
                 .html('');

        if (options.infoPanel) {
            info = appendInfoPanel(container);
        }

        appendGraph(container);

        simulation = initSimulation();

        if (options.neo4jData) {
            loadNeo4jData(options.neo4jData);
        } else if (options.neo4jDataUrl) {
            loadNeo4jDataFromUrl(options.neo4jDataUrl);
        } else {
            console.error('Error: both neo4jData and neo4jDataUrl are empty!');
        }
    }

    function initIconMap() {
        Object.keys(options.iconMap).forEach(function(key, index) {
            var keys = key.split(','),
                value = options.iconMap[key];

            keys.forEach(function(key) {
                options.iconMap[key] = value;
            });
        });
    }

    function initImageMap() {
        var key, keys, selector;

        for (key in options.images) {
            if (options.images.hasOwnProperty(key)) {
                keys = key.split('|');

                if (!options.imageMap[keys[0]]) {
                    options.imageMap[keys[0]] = [key];
                } else {
                    options.imageMap[keys[0]].push(key);
                }
            }
        }
    }

    function initSimulation() {
        var simulation = d3.forceSimulation()
                          .velocityDecay(_options.velocityDecay || options.velocityDecay)
                          .alphaDecay(_options.alphaDecay || options.alphaDecay)

//                           .force('x', d3.force().strength(0.002))
//                           .force('y', d3.force().strength(0.002))
                           .force('collide', d3.forceCollide().radius(function(d) {
                               return options.minCollision;
                           }).iterations(2))
                           .force('charge', d3.forceManyBody())
                           .force('link', d3.forceLink().id(function(d) {
                               return d.id;
                           }))
                           .force('center', d3.forceCenter(svg.node().parentElement.parentElement.clientWidth / 2, svg.node().parentElement.parentElement.clientHeight / 2))
                           .on('tick', function() {
                               tick();
                           })
                           .on('end', function() {
                               if (options.zoomFit && !justLoaded) {
                                   justLoaded = true;
                                   zoomFit(2);
                               }
                           });

        return simulation;
    }

    function loadNeo4jData() {
        nodes = [];
        relationships = [];

        updateWithNeo4jData(options.neo4jData);
    }

    function loadNeo4jDataFromUrl(neo4jDataUrl) {
        nodes = [];
        relationships = [];

        d3.json(neo4jDataUrl, function(error, data) {
            if (error) {
                throw error;
            }

            updateWithNeo4jData(data);
        });
    }

    function merge(target, source) {
        Object.keys(source).forEach(function(property) {
            target[property] = source[property];
        });
    }

    function neo4jDataToD3Data(data) {
        var graph = {
            nodes: [],
            relationships: []
        };

        data.results.forEach(function(result) {
            result.data.forEach(function(data) {
                data.graph.nodes.forEach(function(node) {
                    if (!contains(graph.nodes, node.id)) {
                        graph.nodes.push(node);
                    }
                });

                data.graph.relationships.forEach(function(relationship) {
                    relationship.source = relationship.startNode;
                    relationship.target = relationship.endNode;
                    graph.relationships.push(relationship);
                });

                data.graph.relationships.sort(function(a, b) {
                    if (a.source > b.source) {
                        return 1;
                    } else if (a.source < b.source) {
                        return -1;
                    } else {
                        if (a.target > b.target) {
                            return 1;
                        }

                        if (a.target < b.target) {
                            return -1;
                        } else {
                            return 0;
                        }
                    }
                });

                for (var i = 0; i < data.graph.relationships.length; i++) {
                    if (i !== 0 && data.graph.relationships[i].source === data.graph.relationships[i-1].source && data.graph.relationships[i].target === data.graph.relationships[i-1].target) {
                        data.graph.relationships[i].linknum = data.graph.relationships[i - 1].linknum + 1;
                    } else {
                        data.graph.relationships[i].linknum = 1;
                    }
                }
            });
        });

        return graph;
    }

    function randomD3Data(d, maxNodesToGenerate) {
        var data = {
                nodes: [],
                relationships: []
            },
            i,
            label,
            node,
            numNodes = (maxNodesToGenerate * Math.random() << 0) + 1,
            relationship,
            s = size();

        for (i = 0; i < numNodes; i++) {
            label = randomLabel();

            node = {
                id: s.nodes + 1 + i,
                labels: [label],
                properties: {
                    random: label
                },
                x: d.x,
                y: d.y
            };

            data.nodes[data.nodes.length] = node;

            relationship = {
                id: s.relationships + 1 + i,
                type: label.toUpperCase(),
                startNode: d.id,
                endNode: s.nodes + 1 + i,
                properties: {
                    from: Date.now()
                },
                source: d.id,
                target: s.nodes + 1 + i,
                linknum: s.relationships + 1 + i
            };

            data.relationships[data.relationships.length] = relationship;
        }

        return data;
    }

    function randomLabel() {
        var icons = Object.keys(options.iconMap);
        return icons[icons.length * Math.random() << 0];
    }

    function rotate(cx, cy, x, y, angle) {
        var radians = (Math.PI / 180) * angle,
            cos = Math.cos(radians),
            sin = Math.sin(radians),
            nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
            ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;

        return { x: nx, y: ny };
    }

    function rotatePoint(c, p, angle) {
        return rotate(c.x, c.y, p.x, p.y, angle);
    }

    function rotation(source, target) {
        return Math.atan2(target.y - source.y, target.x - source.x) * 180 / Math.PI;
    }

    function size() {
        return {
            nodes: nodes.length,
            relationships: relationships.length
        };
    }
/*
    function smoothTransform(elem, translate, scale) {
        var animationMilliseconds = 5000,
            timeoutMilliseconds = 50,
            steps = parseInt(animationMilliseconds / timeoutMilliseconds);

        setTimeout(function() {
            smoothTransformStep(elem, translate, scale, timeoutMilliseconds, 1, steps);
        }, timeoutMilliseconds);
    }

    function smoothTransformStep(elem, translate, scale, timeoutMilliseconds, step, steps) {
        var progress = step / steps;

        elem.attr('transform', 'translate(' + (translate[0] * progress) + ', ' + (translate[1] * progress) + ') scale(' + (scale * progress) + ')');

        if (step < steps) {
            setTimeout(function() {
                smoothTransformStep(elem, translate, scale, timeoutMilliseconds, step + 1, steps);
            }, timeoutMilliseconds);
        }
    }
*/
    function stickNode(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function tick() {
        tickNodes();
        tickRelationships();
    }

    function tickNodes() {
        if (node) {
            node.attr('transform', function(d) {
                return 'translate(' + d.x + ', ' + d.y + ')';
            });
        }
    }

    function tickRelationships() {
        if (relationship) {
            relationship.attr('transform', function(d) {
                var angle = rotation(d.source, d.target);
                return 'translate(' + d.source.x + ', ' + d.source.y + ') rotate(' + angle + ')';
            });

            tickRelationshipsTexts();
            tickRelationshipsOutlines();
            tickRelationshipsOverlays();
        }
    }

    function tickRelationshipsOutlines() {
        relationship.each(function(relationship) {
            var rel = d3.select(this),
                outline = rel.select('.outline'),
                text = rel.select('.text'),
                bbox = text.node().getBBox(),
                padding = 3;

            outline.attr('d', function(d) {
                var center = { x: 0, y: 0 },
                    angle = rotation(d.source, d.target),
                    textBoundingBox = text.node().getBBox(),
                    textPadding = 5,
                    u = unitaryVector(d.source, d.target),
                    textMargin = { x: (d.target.x - d.source.x - (textBoundingBox.width + textPadding) * u.x) * 0.5, y: (d.target.y - d.source.y - (textBoundingBox.width + textPadding) * u.y) * 0.5 },
                    n = unitaryNormalVector(d.source, d.target),
                    rotatedPointA1 = rotatePoint(center, { x: 0 + (options.nodeRadius + 1) * u.x - n.x, y: 0 + (options.nodeRadius + 1) * u.y - n.y }, angle),
                    rotatedPointB1 = rotatePoint(center, { x: textMargin.x - n.x, y: textMargin.y - n.y }, angle),
                    rotatedPointC1 = rotatePoint(center, { x: textMargin.x, y: textMargin.y }, angle),
                    rotatedPointD1 = rotatePoint(center, { x: 0 + (options.nodeRadius + 1) * u.x, y: 0 + (options.nodeRadius + 1) * u.y }, angle),
                    rotatedPointA2 = rotatePoint(center, { x: d.target.x - d.source.x - textMargin.x - n.x, y: d.target.y - d.source.y - textMargin.y - n.y }, angle),
                    rotatedPointB2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - n.x - u.x * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - n.y - u.y * options.arrowSize }, angle),
                    rotatedPointC2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - n.x + (n.x - u.x) * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - n.y + (n.y - u.y) * options.arrowSize }, angle),
                    rotatedPointD2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y }, angle),
                    rotatedPointE2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x + (- n.x - u.x) * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y + (- n.y - u.y) * options.arrowSize }, angle),
                    rotatedPointF2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - u.x * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - u.y * options.arrowSize }, angle),
                    rotatedPointG2 = rotatePoint(center, { x: d.target.x - d.source.x - textMargin.x, y: d.target.y - d.source.y - textMargin.y }, angle);

                return 'M ' + rotatedPointA1.x + ' ' + rotatedPointA1.y +
                       ' L ' + rotatedPointB1.x + ' ' + rotatedPointB1.y +
                       ' L ' + rotatedPointC1.x + ' ' + rotatedPointC1.y +
                       ' L ' + rotatedPointD1.x + ' ' + rotatedPointD1.y +
                       ' Z M ' + rotatedPointA2.x + ' ' + rotatedPointA2.y +
                       ' L ' + rotatedPointB2.x + ' ' + rotatedPointB2.y +
                       ' L ' + rotatedPointC2.x + ' ' + rotatedPointC2.y +
                       ' L ' + rotatedPointD2.x + ' ' + rotatedPointD2.y +
                       ' L ' + rotatedPointE2.x + ' ' + rotatedPointE2.y +
                       ' L ' + rotatedPointF2.x + ' ' + rotatedPointF2.y +
                       ' L ' + rotatedPointG2.x + ' ' + rotatedPointG2.y +
                       ' Z';
            });
        });
    }

    function tickRelationshipsOverlays() {
        relationshipOverlay.attr('d', function(d) {
            var center = { x: 0, y: 0 },
                angle = rotation(d.source, d.target),
                n1 = unitaryNormalVector(d.source, d.target),
                n = unitaryNormalVector(d.source, d.target, 50),
                rotatedPointA = rotatePoint(center, { x: 0 - n.x, y: 0 - n.y }, angle),
                rotatedPointB = rotatePoint(center, { x: d.target.x - d.source.x - n.x, y: d.target.y - d.source.y - n.y }, angle),
                rotatedPointC = rotatePoint(center, { x: d.target.x - d.source.x + n.x - n1.x, y: d.target.y - d.source.y + n.y - n1.y }, angle),
                rotatedPointD = rotatePoint(center, { x: 0 + n.x - n1.x, y: 0 + n.y - n1.y }, angle);

            return 'M ' + rotatedPointA.x + ' ' + rotatedPointA.y +
                   ' L ' + rotatedPointB.x + ' ' + rotatedPointB.y +
                   ' L ' + rotatedPointC.x + ' ' + rotatedPointC.y +
                   ' L ' + rotatedPointD.x + ' ' + rotatedPointD.y +
                   ' Z';
        });
    }

    function tickRelationshipsTexts() {
        relationshipText.attr('transform', function(d) {
            var angle = (rotation(d.source, d.target) + 360) % 360,
                mirror = angle > 90 && angle < 270,
                center = { x: 0, y: 0 },
                n = unitaryNormalVector(d.source, d.target),
                nWeight = mirror ? 2 : -3,
                point = { x: (d.target.x - d.source.x) * 0.5 + n.x * nWeight, y: (d.target.y - d.source.y) * 0.5 + n.y * nWeight },
                rotatedPoint = rotatePoint(center, point, angle);

            return 'translate(' + rotatedPoint.x + ', ' + rotatedPoint.y + ') rotate(' + (mirror ? 180 : 0) + ')';
        });
    }

    function toString(d) {
        var s = d.labels ? d.labels[0] : d.type;

        s += ' (<id>: ' + d.id;

        Object.keys(d.properties).forEach(function(property) {
            s += ', ' + property + ': ' + JSON.stringify(d.properties[property]);
        });

        s += ')';

        return s;
    }

    function unitaryNormalVector(source, target, newLength) {
        var center = { x: 0, y: 0 },
            vector = unitaryVector(source, target, newLength);

        return rotatePoint(center, vector, 90);
    }

    function unitaryVector(source, target, newLength) {
        var length = Math.sqrt(Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)) / Math.sqrt(newLength || 1);

        return {
            x: (target.x - source.x) / length,
            y: (target.y - source.y) / length,
        };
    }

    function updateWithD3Data(d3Data) {
        updateNodesAndRelationships(d3Data.nodes, d3Data.relationships);
    }

    function updateWithNeo4jData(neo4jData) {
        var d3Data = neo4jDataToD3Data(neo4jData);
        updateWithD3Data(d3Data);
    }

    function updateInfo(d) {
        clearInfo();

        if (d.labels) {
            appendInfoElementClass('class', d.labels[0]);
        } else {
            appendInfoElementRelationship('class', d.type);
        }

        appendInfoElementProperty('property', '&lt;id&gt;', d.id);

        Object.keys(d.properties).forEach(function(property) {
            appendInfoElementProperty('property', property, JSON.stringify(d.properties[property]));
        });
    }

    function updateNodes(n) {
        Array.prototype.push.apply(nodes, n);

        node = svgNodes.selectAll('.node')
                       .data(nodes, function(d) { return d.id; });
        var nodeEnter = appendNodeToGraph();
        node = nodeEnter.merge(node);
    }

    function updateNodesAndRelationships(n, r) {
        updateRelationships(r);
        updateNodes(n);

        simulation.nodes(nodes);
        simulation.force('link').links(relationships);
    }

    function updateRelationships(r) {
        Array.prototype.push.apply(relationships, r);

        relationship = svgRelationships.selectAll('.relationship')
                                       .data(relationships, function(d) { return d.id; });

        var relationshipEnter = appendRelationshipToGraph();

        relationship = relationshipEnter.relationship.merge(relationship);

        relationshipOutline = svg.selectAll('.relationship .outline');
        relationshipOutline = relationshipEnter.outline.merge(relationshipOutline);

        relationshipOverlay = svg.selectAll('.relationship .overlay');
        relationshipOverlay = relationshipEnter.overlay.merge(relationshipOverlay);

        relationshipText = svg.selectAll('.relationship .text');
        relationshipText = relationshipEnter.text.merge(relationshipText);
    }

    function version() {
        return VERSION;
    }

    function zoomFit(transitionDuration) {
        var bounds = svg.node().getBBox(),
            parent = svg.node().parentElement.parentElement,
            fullWidth = parent.clientWidth,
            fullHeight = parent.clientHeight,
            width = bounds.width,
            height = bounds.height,
            midX = bounds.x + width / 2,
            midY = bounds.y + height / 2;

        if (width === 0 || height === 0) {
            return; // nothing to fit
        }

        svgScale = 0.85 / Math.max(width / fullWidth, height / fullHeight);
        svgTranslate = [fullWidth / 2 - svgScale * midX, fullHeight / 2 - svgScale * midY];

        svg.attr('transform', 'translate(' + svgTranslate[0] + ', ' + svgTranslate[1] + ') scale(' + svgScale + ')');
//        smoothTransform(svgTranslate, svgScale);
    }

    init(_selector, _options);

    return {
        appendRandomDataToNode: appendRandomDataToNode,
        neo4jDataToD3Data: neo4jDataToD3Data,
        randomD3Data: randomD3Data,
        size: size,
        updateWithD3Data: updateWithD3Data,
        updateWithNeo4jData: updateWithNeo4jData,
        version: version
    };
}

module.exports = Neo4jD3;

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi9pbmRleC5qcyIsInNyYy9tYWluL3NjcmlwdHMvbmVvNGpkMy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBuZW80amQzID0gcmVxdWlyZSgnLi9zY3JpcHRzL25lbzRqZDMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZW80amQzO1xuIiwiLyogZ2xvYmFsIGQzLCBkb2N1bWVudCAqL1xyXG4vKiBqc2hpbnQgbGF0ZWRlZjpub2Z1bmMgKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG5cclxuZnVuY3Rpb24gTmVvNGpEMyhfc2VsZWN0b3IsIF9vcHRpb25zKSB7XHJcbiAgICB2YXIgY29udGFpbmVyLCBncmFwaCwgaW5mbywgbm9kZSwgbm9kZXMsIHJlbGF0aW9uc2hpcCwgcmVsYXRpb25zaGlwT3V0bGluZSwgcmVsYXRpb25zaGlwT3ZlcmxheSwgcmVsYXRpb25zaGlwVGV4dCwgcmVsYXRpb25zaGlwcywgc2VsZWN0b3IsIHNpbXVsYXRpb24sIHN2Zywgc3ZnTm9kZXMsIHN2Z1JlbGF0aW9uc2hpcHMsIHN2Z1NjYWxlLCBzdmdUcmFuc2xhdGUsXHJcbiAgICAgICAgY2xhc3NlczJjb2xvcnMgPSB7fSxcclxuICAgICAgICBqdXN0TG9hZGVkID0gZmFsc2UsXHJcbiAgICAgICAgbnVtQ2xhc3NlcyA9IDAsXHJcbiAgICAgICAgb3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgYXJyb3dTaXplOiA0LFxyXG4gICAgICAgICAgICBjb2xvcnM6IGNvbG9ycygpLFxyXG4gICAgICAgICAgICBoaWdobGlnaHQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgaWNvbk1hcDogZm9udEF3ZXNvbWVJY29ucygpLFxyXG4gICAgICAgICAgICBpY29uczogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBpbWFnZU1hcDoge30sXHJcbiAgICAgICAgICAgIGltYWdlczogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBpbmZvUGFuZWw6IHRydWUsXHJcbiAgICAgICAgICAgIG1pbkNvbGxpc2lvbjogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBuZW80akRhdGE6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgbmVvNGpEYXRhVXJsOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIG5vZGVPdXRsaW5lRmlsbENvbG9yOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIG5vZGVSYWRpdXM6IDI1LFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBDb2xvcjogJyNhNWFiYjYnLFxyXG4gICAgICAgICAgICB6b29tRml0OiBmYWxzZSxcclxuICAgICAgICAgICAgdmVsb2NpdHlEZWNheTogMC40LFxyXG4gICAgICAgICAgICBhbHBoYURlY2F5OiAwLjAyMjhcclxuICAgICAgICB9LFxyXG4gICAgICAgIFZFUlNJT04gPSAnMC4wLjEnO1xyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZEdyYXBoKGNvbnRhaW5lcikge1xyXG4gICAgICAgIHN2ZyA9IGNvbnRhaW5lci5hcHBlbmQoJ3N2ZycpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCAnMTAwJScpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ25lbzRqZDMtZ3JhcGgnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgIC5jYWxsKGQzLnpvb20oKS5vbignem9vbScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSBkMy5ldmVudC50cmFuc2Zvcm0uayxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0ZSA9IFtkMy5ldmVudC50cmFuc2Zvcm0ueCwgZDMuZXZlbnQudHJhbnNmb3JtLnldO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN2Z1RyYW5zbGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRlWzBdICs9IHN2Z1RyYW5zbGF0ZVswXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0ZVsxXSArPSBzdmdUcmFuc2xhdGVbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdmdTY2FsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NhbGUgKj0gc3ZnU2NhbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0cmFuc2xhdGVbMF0gKyAnLCAnICsgdHJhbnNsYXRlWzFdICsgJykgc2NhbGUoJyArIHNjYWxlICsgJyknKTtcclxuICAgICAgICAgICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgICAgICAgICAgICAub24oJ2RibGNsaWNrLnpvb20nLCBudWxsKVxyXG4gICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ2cnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcclxuICAgICAgICAgICAgICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgJzEwMCUnKTtcclxuXHJcbiAgICAgICAgc3ZnUmVsYXRpb25zaGlwcyA9IHN2Zy5hcHBlbmQoJ2cnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXR0cignY2xhc3MnLCAncmVsYXRpb25zaGlwcycpO1xyXG5cclxuICAgICAgICBzdmdOb2RlcyA9IHN2Zy5hcHBlbmQoJ2cnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ25vZGVzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW1hZ2VUb05vZGUobm9kZSkge1xyXG4gICAgICAgIHJldHVybiBub2RlLmFwcGVuZCgnaW1hZ2UnKVxyXG4gICAgICAgICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaWNvbihkKSA/ICcyNHB4JzogJzMwcHgnO1xyXG4gICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgIC5hdHRyKCd4JywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gJzVweCc6ICctMTVweCc7XHJcbiAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgLmF0dHIoJ3hsaW5rOmhyZWYnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGltYWdlKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgIC5hdHRyKCd5JywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gJzVweCc6ICctMTZweCc7XHJcbiAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gJzI0cHgnOiAnMzBweCc7XHJcbiAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvUGFuZWwoY29udGFpbmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvbnRhaW5lci5hcHBlbmQoJ2RpdicpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICduZW80amQzLWluZm8nKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvRWxlbWVudChjbHMsIGlzTm9kZSwgcHJvcGVydHksIHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIGVsZW0gPSBpbmZvLmFwcGVuZCgnYScpO1xyXG5cclxuICAgICAgICBlbGVtLmF0dHIoJ2hyZWYnLCAnIycpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsIGNscylcclxuICAgICAgICAgICAgLmh0bWwoJzxzdHJvbmc+JyArIHByb3BlcnR5ICsgJzwvc3Ryb25nPicgKyAodmFsdWUgPyAoJzogJyArIHZhbHVlKSA6ICcnKSk7XHJcblxyXG4gICAgICAgIGlmICghdmFsdWUpIHtcclxuICAgICAgICAgICAgZWxlbS5zdHlsZSgnYmFja2dyb3VuZC1jb2xvcicsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgOiAoaXNOb2RlID8gY2xhc3MyY29sb3IocHJvcGVydHkpIDogZGVmYXVsdENvbG9yKCkpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5zdHlsZSgnYm9yZGVyLWNvbG9yJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yID8gY2xhc3MyZGFya2VuQ29sb3Iob3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvcikgOiAoaXNOb2RlID8gY2xhc3MyZGFya2VuQ29sb3IocHJvcGVydHkpIDogZGVmYXVsdERhcmtlbkNvbG9yKCkpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5zdHlsZSgnY29sb3InLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBjbGFzczJkYXJrZW5Db2xvcihvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yKSA6ICcjZmZmJztcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvRWxlbWVudENsYXNzKGNscywgbm9kZSkge1xyXG4gICAgICAgIGFwcGVuZEluZm9FbGVtZW50KGNscywgdHJ1ZSwgbm9kZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW5mb0VsZW1lbnRQcm9wZXJ0eShjbHMsIHByb3BlcnR5LCB2YWx1ZSkge1xyXG4gICAgICAgIGFwcGVuZEluZm9FbGVtZW50KGNscywgZmFsc2UsIHByb3BlcnR5LCB2YWx1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW5mb0VsZW1lbnRSZWxhdGlvbnNoaXAoY2xzLCByZWxhdGlvbnNoaXApIHtcclxuICAgICAgICBhcHBlbmRJbmZvRWxlbWVudChjbHMsIGZhbHNlLCByZWxhdGlvbnNoaXApO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZE5vZGUoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuZW50ZXIoKVxyXG4gICAgICAgICAgICAgICAgICAgLmFwcGVuZCgnZycpXHJcbiAgICAgICAgICAgICAgICAgICAuYXR0cignY2xhc3MnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhpZ2hsaWdodCwgaSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyA9ICdub2RlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWwgPSBkLmxhYmVsc1swXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKGljb24oZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyArPSAnIG5vZGUtaWNvbic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1hZ2UoZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyArPSAnIG5vZGUtaW1hZ2UnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuaGlnaGxpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBvcHRpb25zLmhpZ2hsaWdodC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGlnaGxpZ2h0ID0gb3B0aW9ucy5oaWdobGlnaHRbaV07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGQubGFiZWxzWzBdID09PSBoaWdobGlnaHQuY2xhc3MgJiYgZC5wcm9wZXJ0aWVzW2hpZ2hsaWdodC5wcm9wZXJ0eV0gPT09IGhpZ2hsaWdodC52YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgKz0gJyBub2RlLWhpZ2hsaWdodGVkJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNsYXNzZXM7XHJcbiAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICBkLmZ4ID0gZC5meSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVDbGljayA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uTm9kZUNsaWNrKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgIHN0aWNrTm9kZShkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZURvdWJsZUNsaWNrID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlRG91YmxlQ2xpY2soZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgIC5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5mbykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVJbmZvKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZU1vdXNlRW50ZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vbk5vZGVNb3VzZUVudGVyKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZm8pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJJbmZvKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZU1vdXNlTGVhdmUgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vbk5vZGVNb3VzZUxlYXZlKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAuY2FsbChkMy5kcmFnKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLm9uKCdzdGFydCcsIGRyYWdTdGFydGVkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAub24oJ2RyYWcnLCBkcmFnZ2VkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAub24oJ2VuZCcsIGRyYWdFbmRlZCkpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZE5vZGVUb0dyYXBoKCkge1xyXG4gICAgICAgIHZhciBuID0gYXBwZW5kTm9kZSgpO1xyXG5cclxuICAgICAgICBhcHBlbmRSaW5nVG9Ob2RlKG4pO1xyXG4gICAgICAgIGFwcGVuZE91dGxpbmVUb05vZGUobik7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmljb25zKSB7XHJcbiAgICAgICAgICAgIGFwcGVuZFRleHRUb05vZGUobik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5pbWFnZXMpIHtcclxuICAgICAgICAgICAgYXBwZW5kSW1hZ2VUb05vZGUobik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRPdXRsaW5lVG9Ob2RlKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5hcHBlbmQoJ2NpcmNsZScpXHJcbiAgICAgICAgICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnb3V0bGluZScpXHJcbiAgICAgICAgICAgICAgICAgICAuYXR0cigncicsIG9wdGlvbnMubm9kZVJhZGl1cylcclxuICAgICAgICAgICAgICAgICAgIC5zdHlsZSgnZmlsbCcsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgOiBjbGFzczJjb2xvcihkLmxhYmVsc1swXSk7XHJcbiAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgLnN0eWxlKCdzdHJva2UnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBjbGFzczJkYXJrZW5Db2xvcihvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yKSA6IGNsYXNzMmRhcmtlbkNvbG9yKGQubGFiZWxzWzBdKTtcclxuICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAuYXBwZW5kKCd0aXRsZScpLnRleHQoZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0b1N0cmluZyhkKTtcclxuICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZFJpbmdUb05vZGUobm9kZSkge1xyXG4gICAgICAgIHJldHVybiBub2RlLmFwcGVuZCgnY2lyY2xlJylcclxuICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdyaW5nJylcclxuICAgICAgICAgICAgICAgICAgIC5hdHRyKCdyJywgb3B0aW9ucy5ub2RlUmFkaXVzICogMS4xNilcclxuICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ3RpdGxlJykudGV4dChmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRvU3RyaW5nKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kVGV4dFRvTm9kZShub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ3RleHQnICsgKGljb24oZCkgPyAnIGljb24nIDogJycpO1xyXG4gICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgIC5hdHRyKCdmaWxsJywgJyNmZmZmZmYnKVxyXG4gICAgICAgICAgICAgICAgICAgLmF0dHIoJ2ZvbnQtc2l6ZScsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaWNvbihkKSA/IChvcHRpb25zLm5vZGVSYWRpdXMgKyAncHgnKSA6ICcxMHB4JztcclxuICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAuYXR0cigncG9pbnRlci1ldmVudHMnLCAnbm9uZScpXHJcbiAgICAgICAgICAgICAgICAgICAuYXR0cigndGV4dC1hbmNob3InLCAnbWlkZGxlJylcclxuICAgICAgICAgICAgICAgICAgIC5hdHRyKCd5JywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gKHBhcnNlSW50KE1hdGgucm91bmQob3B0aW9ucy5ub2RlUmFkaXVzICogMC4zMikpICsgJ3B4JykgOiAnNHB4JztcclxuICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAuaHRtbChmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgdmFyIF9pY29uID0gaWNvbihkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gX2ljb24gPyAnJiN4JyArIF9pY29uIDogZC5pZDtcclxuICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZFJhbmRvbURhdGFUb05vZGUoZCwgbWF4Tm9kZXNUb0dlbmVyYXRlKSB7XHJcbiAgICAgICAgdmFyIGRhdGEgPSByYW5kb21EM0RhdGEoZCwgbWF4Tm9kZXNUb0dlbmVyYXRlKTtcclxuICAgICAgICB1cGRhdGVXaXRoTmVvNGpEYXRhKGRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZFJlbGF0aW9uc2hpcCgpIHtcclxuICAgICAgICByZXR1cm4gcmVsYXRpb25zaGlwLmVudGVyKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZCgnZycpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdyZWxhdGlvbnNoaXAnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uUmVsYXRpb25zaGlwRG91YmxlQ2xpY2sgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uUmVsYXRpb25zaGlwRG91YmxlQ2xpY2soZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmZvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlSW5mbyhkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kT3V0bGluZVRvUmVsYXRpb25zaGlwKHIpIHtcclxuICAgICAgICByZXR1cm4gci5hcHBlbmQoJ3BhdGgnKVxyXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ291dGxpbmUnKVxyXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnI2E1YWJiNicpXHJcbiAgICAgICAgICAgICAgICAuYXR0cignc3Ryb2tlJywgJ25vbmUnKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRPdmVybGF5VG9SZWxhdGlvbnNoaXAocikge1xyXG4gICAgICAgIHJldHVybiByLmFwcGVuZCgncGF0aCcpXHJcbiAgICAgICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnb3ZlcmxheScpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZFRleHRUb1JlbGF0aW9uc2hpcChyKSB7XHJcbiAgICAgICAgcmV0dXJuIHIuYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICd0ZXh0JylcclxuICAgICAgICAgICAgICAgIC5hdHRyKCdmaWxsJywgJyMwMDAwMDAnKVxyXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2ZvbnQtc2l6ZScsICc4cHgnKVxyXG4gICAgICAgICAgICAgICAgLmF0dHIoJ3BvaW50ZXItZXZlbnRzJywgJ25vbmUnKVxyXG4gICAgICAgICAgICAgICAgLmF0dHIoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpXHJcbiAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQudHlwZTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZFJlbGF0aW9uc2hpcFRvR3JhcGgoKSB7XHJcbiAgICAgICAgdmFyIHJlbGF0aW9uc2hpcCA9IGFwcGVuZFJlbGF0aW9uc2hpcCgpLFxyXG4gICAgICAgICAgICB0ZXh0ID0gYXBwZW5kVGV4dFRvUmVsYXRpb25zaGlwKHJlbGF0aW9uc2hpcCksXHJcbiAgICAgICAgICAgIG91dGxpbmUgPSBhcHBlbmRPdXRsaW5lVG9SZWxhdGlvbnNoaXAocmVsYXRpb25zaGlwKSxcclxuICAgICAgICAgICAgb3ZlcmxheSA9IGFwcGVuZE92ZXJsYXlUb1JlbGF0aW9uc2hpcChyZWxhdGlvbnNoaXApO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBvdXRsaW5lOiBvdXRsaW5lLFxyXG4gICAgICAgICAgICBvdmVybGF5OiBvdmVybGF5LFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXA6IHJlbGF0aW9uc2hpcCxcclxuICAgICAgICAgICAgdGV4dDogdGV4dFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2xhc3MyY29sb3IoY2xzKSB7XHJcbiAgICAgICAgdmFyIGNvbG9yID0gY2xhc3NlczJjb2xvcnNbY2xzXTtcclxuXHJcbiAgICAgICAgaWYgKCFjb2xvcikge1xyXG4vLyAgICAgICAgICAgIGNvbG9yID0gb3B0aW9ucy5jb2xvcnNbTWF0aC5taW4obnVtQ2xhc3Nlcywgb3B0aW9ucy5jb2xvcnMubGVuZ3RoIC0gMSldO1xyXG4gICAgICAgICAgICBjb2xvciA9IG9wdGlvbnMuY29sb3JzW251bUNsYXNzZXMgJSBvcHRpb25zLmNvbG9ycy5sZW5ndGhdO1xyXG4gICAgICAgICAgICBjbGFzc2VzMmNvbG9yc1tjbHNdID0gY29sb3I7XHJcbiAgICAgICAgICAgIG51bUNsYXNzZXMrKztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjb2xvcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjbGFzczJkYXJrZW5Db2xvcihjbHMpIHtcclxuICAgICAgICByZXR1cm4gZDMucmdiKGNsYXNzMmNvbG9yKGNscykpLmRhcmtlcigxKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjbGVhckluZm8oKSB7XHJcbiAgICAgICAgaW5mby5odG1sKCcnKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb2xvcigpIHtcclxuICAgICAgICByZXR1cm4gb3B0aW9ucy5jb2xvcnNbb3B0aW9ucy5jb2xvcnMubGVuZ3RoICogTWF0aC5yYW5kb20oKSA8PCAwXTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb2xvcnMoKSB7XHJcbiAgICAgICAgLy8gZDMuc2NoZW1lQ2F0ZWdvcnkxMCxcclxuICAgICAgICAvLyBkMy5zY2hlbWVDYXRlZ29yeTIwLFxyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgICcjNjhiZGY2JywgLy8gbGlnaHQgYmx1ZVxyXG4gICAgICAgICAgICAnIzZkY2U5ZScsIC8vIGdyZWVuICMxXHJcbiAgICAgICAgICAgICcjZmFhZmMyJywgLy8gbGlnaHQgcGlua1xyXG4gICAgICAgICAgICAnI2YyYmFmNicsIC8vIHB1cnBsZVxyXG4gICAgICAgICAgICAnI2ZmOTI4YycsIC8vIGxpZ2h0IHJlZFxyXG4gICAgICAgICAgICAnI2ZjZWE3ZScsIC8vIGxpZ2h0IHllbGxvd1xyXG4gICAgICAgICAgICAnI2ZmYzc2NicsIC8vIGxpZ2h0IG9yYW5nZVxyXG4gICAgICAgICAgICAnIzQwNWY5ZScsIC8vIG5hdnkgYmx1ZVxyXG4gICAgICAgICAgICAnI2E1YWJiNicsIC8vIGRhcmsgZ3JheVxyXG4gICAgICAgICAgICAnIzc4Y2VjYicsIC8vIGdyZWVuICMyLFxyXG4gICAgICAgICAgICAnI2I4OGNiYicsIC8vIGRhcmsgcHVycGxlXHJcbiAgICAgICAgICAgICcjY2VkMmQ5JywgLy8gbGlnaHQgZ3JheVxyXG4gICAgICAgICAgICAnI2U4NDY0NicsIC8vIGRhcmsgcmVkXHJcbiAgICAgICAgICAgICcjZmE1Zjg2JywgLy8gZGFyayBwaW5rXHJcbiAgICAgICAgICAgICcjZmZhYjFhJywgLy8gZGFyayBvcmFuZ2VcclxuICAgICAgICAgICAgJyNmY2RhMTknLCAvLyBkYXJrIHllbGxvd1xyXG4gICAgICAgICAgICAnIzc5N2I4MCcsIC8vIGJsYWNrXHJcbiAgICAgICAgICAgICcjYzlkOTZmJywgLy8gcGlzdGFjY2hpb1xyXG4gICAgICAgICAgICAnIzQ3OTkxZicsIC8vIGdyZWVuICMzXHJcbiAgICAgICAgICAgICcjNzBlZGVlJywgLy8gdHVycXVvaXNlXHJcbiAgICAgICAgICAgICcjZmY3NWVhJyAgLy8gcGlua1xyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29udGFpbnMoYXJyYXksIGlkKSB7XHJcbiAgICAgICAgdmFyIGZpbHRlciA9IGFycmF5LmZpbHRlcihmdW5jdGlvbihlbGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtLmlkID09PSBpZDtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZpbHRlci5sZW5ndGggPiAwO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlZmF1bHRDb2xvcigpIHtcclxuICAgICAgICByZXR1cm4gb3B0aW9ucy5yZWxhdGlvbnNoaXBDb2xvcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWZhdWx0RGFya2VuQ29sb3IoKSB7XHJcbiAgICAgICAgcmV0dXJuIGQzLnJnYihvcHRpb25zLmNvbG9yc1tvcHRpb25zLmNvbG9ycy5sZW5ndGggLSAxXSkuZGFya2VyKDEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRyYWdFbmRlZChkKSB7XHJcbiAgICAgICAgaWYgKCFkMy5ldmVudC5hY3RpdmUpIHtcclxuICAgICAgICAgICAgc2ltdWxhdGlvbi5hbHBoYVRhcmdldCgwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVEcmFnRW5kID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlRHJhZ0VuZChkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZHJhZ2dlZChkKSB7XHJcbiAgICAgICAgc3RpY2tOb2RlKGQpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRyYWdTdGFydGVkKGQpIHtcclxuICAgICAgICBpZiAoIWQzLmV2ZW50LmFjdGl2ZSkge1xyXG4gICAgICAgICAgICBzaW11bGF0aW9uLmFscGhhVGFyZ2V0KDAuMykucmVzdGFydCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZC5meCA9IGQueDtcclxuICAgICAgICBkLmZ5ID0gZC55O1xyXG5cclxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlRHJhZ1N0YXJ0ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlRHJhZ1N0YXJ0KGQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBleHRlbmQob2JqMSwgb2JqMikge1xyXG4gICAgICAgIHZhciBvYmogPSB7fTtcclxuXHJcbiAgICAgICAgbWVyZ2Uob2JqLCBvYmoxKTtcclxuICAgICAgICBtZXJnZShvYmosIG9iajIpO1xyXG5cclxuICAgICAgICByZXR1cm4gb2JqO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZvbnRBd2Vzb21lSWNvbnMoKSB7XHJcbiAgICAgICAgLy8gcmV0dXJuIHsnZ2xhc3MnOidmMDAwJywnbXVzaWMnOidmMDAxJywnc2VhcmNoJzonZjAwMicsJ2VudmVsb3BlLW8nOidmMDAzJywnaGVhcnQnOidmMDA0Jywnc3Rhcic6J2YwMDUnLCdzdGFyLW8nOidmMDA2JywndXNlcic6J2YwMDcnLCdmaWxtJzonZjAwOCcsJ3RoLWxhcmdlJzonZjAwOScsJ3RoJzonZjAwYScsJ3RoLWxpc3QnOidmMDBiJywnY2hlY2snOidmMDBjJywncmVtb3ZlLGNsb3NlLHRpbWVzJzonZjAwZCcsJ3NlYXJjaC1wbHVzJzonZjAwZScsJ3NlYXJjaC1taW51cyc6J2YwMTAnLCdwb3dlci1vZmYnOidmMDExJywnc2lnbmFsJzonZjAxMicsJ2dlYXIsY29nJzonZjAxMycsJ3RyYXNoLW8nOidmMDE0JywnaG9tZSc6J2YwMTUnLCdmaWxlLW8nOidmMDE2JywnY2xvY2stbyc6J2YwMTcnLCdyb2FkJzonZjAxOCcsJ2Rvd25sb2FkJzonZjAxOScsJ2Fycm93LWNpcmNsZS1vLWRvd24nOidmMDFhJywnYXJyb3ctY2lyY2xlLW8tdXAnOidmMDFiJywnaW5ib3gnOidmMDFjJywncGxheS1jaXJjbGUtbyc6J2YwMWQnLCdyb3RhdGUtcmlnaHQscmVwZWF0JzonZjAxZScsJ3JlZnJlc2gnOidmMDIxJywnbGlzdC1hbHQnOidmMDIyJywnbG9jayc6J2YwMjMnLCdmbGFnJzonZjAyNCcsJ2hlYWRwaG9uZXMnOidmMDI1Jywndm9sdW1lLW9mZic6J2YwMjYnLCd2b2x1bWUtZG93bic6J2YwMjcnLCd2b2x1bWUtdXAnOidmMDI4JywncXJjb2RlJzonZjAyOScsJ2JhcmNvZGUnOidmMDJhJywndGFnJzonZjAyYicsJ3RhZ3MnOidmMDJjJywnYm9vayc6J2YwMmQnLCdib29rbWFyayc6J2YwMmUnLCdwcmludCc6J2YwMmYnLCdjYW1lcmEnOidmMDMwJywnZm9udCc6J2YwMzEnLCdib2xkJzonZjAzMicsJ2l0YWxpYyc6J2YwMzMnLCd0ZXh0LWhlaWdodCc6J2YwMzQnLCd0ZXh0LXdpZHRoJzonZjAzNScsJ2FsaWduLWxlZnQnOidmMDM2JywnYWxpZ24tY2VudGVyJzonZjAzNycsJ2FsaWduLXJpZ2h0JzonZjAzOCcsJ2FsaWduLWp1c3RpZnknOidmMDM5JywnbGlzdCc6J2YwM2EnLCdkZWRlbnQsb3V0ZGVudCc6J2YwM2InLCdpbmRlbnQnOidmMDNjJywndmlkZW8tY2FtZXJhJzonZjAzZCcsJ3Bob3RvLGltYWdlLHBpY3R1cmUtbyc6J2YwM2UnLCdwZW5jaWwnOidmMDQwJywnbWFwLW1hcmtlcic6J2YwNDEnLCdhZGp1c3QnOidmMDQyJywndGludCc6J2YwNDMnLCdlZGl0LHBlbmNpbC1zcXVhcmUtbyc6J2YwNDQnLCdzaGFyZS1zcXVhcmUtbyc6J2YwNDUnLCdjaGVjay1zcXVhcmUtbyc6J2YwNDYnLCdhcnJvd3MnOidmMDQ3Jywnc3RlcC1iYWNrd2FyZCc6J2YwNDgnLCdmYXN0LWJhY2t3YXJkJzonZjA0OScsJ2JhY2t3YXJkJzonZjA0YScsJ3BsYXknOidmMDRiJywncGF1c2UnOidmMDRjJywnc3RvcCc6J2YwNGQnLCdmb3J3YXJkJzonZjA0ZScsJ2Zhc3QtZm9yd2FyZCc6J2YwNTAnLCdzdGVwLWZvcndhcmQnOidmMDUxJywnZWplY3QnOidmMDUyJywnY2hldnJvbi1sZWZ0JzonZjA1MycsJ2NoZXZyb24tcmlnaHQnOidmMDU0JywncGx1cy1jaXJjbGUnOidmMDU1JywnbWludXMtY2lyY2xlJzonZjA1NicsJ3RpbWVzLWNpcmNsZSc6J2YwNTcnLCdjaGVjay1jaXJjbGUnOidmMDU4JywncXVlc3Rpb24tY2lyY2xlJzonZjA1OScsJ2luZm8tY2lyY2xlJzonZjA1YScsJ2Nyb3NzaGFpcnMnOidmMDViJywndGltZXMtY2lyY2xlLW8nOidmMDVjJywnY2hlY2stY2lyY2xlLW8nOidmMDVkJywnYmFuJzonZjA1ZScsJ2Fycm93LWxlZnQnOidmMDYwJywnYXJyb3ctcmlnaHQnOidmMDYxJywnYXJyb3ctdXAnOidmMDYyJywnYXJyb3ctZG93bic6J2YwNjMnLCdtYWlsLWZvcndhcmQsc2hhcmUnOidmMDY0JywnZXhwYW5kJzonZjA2NScsJ2NvbXByZXNzJzonZjA2NicsJ3BsdXMnOidmMDY3JywnbWludXMnOidmMDY4JywnYXN0ZXJpc2snOidmMDY5JywnZXhjbGFtYXRpb24tY2lyY2xlJzonZjA2YScsJ2dpZnQnOidmMDZiJywnbGVhZic6J2YwNmMnLCdmaXJlJzonZjA2ZCcsJ2V5ZSc6J2YwNmUnLCdleWUtc2xhc2gnOidmMDcwJywnd2FybmluZyxleGNsYW1hdGlvbi10cmlhbmdsZSc6J2YwNzEnLCdwbGFuZSc6J2YwNzInLCdjYWxlbmRhcic6J2YwNzMnLCdyYW5kb20nOidmMDc0JywnY29tbWVudCc6J2YwNzUnLCdtYWduZXQnOidmMDc2JywnY2hldnJvbi11cCc6J2YwNzcnLCdjaGV2cm9uLWRvd24nOidmMDc4JywncmV0d2VldCc6J2YwNzknLCdzaG9wcGluZy1jYXJ0JzonZjA3YScsJ2ZvbGRlcic6J2YwN2InLCdmb2xkZXItb3Blbic6J2YwN2MnLCdhcnJvd3Mtdic6J2YwN2QnLCdhcnJvd3MtaCc6J2YwN2UnLCdiYXItY2hhcnQtbyxiYXItY2hhcnQnOidmMDgwJywndHdpdHRlci1zcXVhcmUnOidmMDgxJywnZmFjZWJvb2stc3F1YXJlJzonZjA4MicsJ2NhbWVyYS1yZXRybyc6J2YwODMnLCdrZXknOidmMDg0JywnZ2VhcnMsY29ncyc6J2YwODUnLCdjb21tZW50cyc6J2YwODYnLCd0aHVtYnMtby11cCc6J2YwODcnLCd0aHVtYnMtby1kb3duJzonZjA4OCcsJ3N0YXItaGFsZic6J2YwODknLCdoZWFydC1vJzonZjA4YScsJ3NpZ24tb3V0JzonZjA4YicsJ2xpbmtlZGluLXNxdWFyZSc6J2YwOGMnLCd0aHVtYi10YWNrJzonZjA4ZCcsJ2V4dGVybmFsLWxpbmsnOidmMDhlJywnc2lnbi1pbic6J2YwOTAnLCd0cm9waHknOidmMDkxJywnZ2l0aHViLXNxdWFyZSc6J2YwOTInLCd1cGxvYWQnOidmMDkzJywnbGVtb24tbyc6J2YwOTQnLCdwaG9uZSc6J2YwOTUnLCdzcXVhcmUtbyc6J2YwOTYnLCdib29rbWFyay1vJzonZjA5NycsJ3Bob25lLXNxdWFyZSc6J2YwOTgnLCd0d2l0dGVyJzonZjA5OScsJ2ZhY2Vib29rLWYsZmFjZWJvb2snOidmMDlhJywnZ2l0aHViJzonZjA5YicsJ3VubG9jayc6J2YwOWMnLCdjcmVkaXQtY2FyZCc6J2YwOWQnLCdmZWVkLHJzcyc6J2YwOWUnLCdoZGQtbyc6J2YwYTAnLCdidWxsaG9ybic6J2YwYTEnLCdiZWxsJzonZjBmMycsJ2NlcnRpZmljYXRlJzonZjBhMycsJ2hhbmQtby1yaWdodCc6J2YwYTQnLCdoYW5kLW8tbGVmdCc6J2YwYTUnLCdoYW5kLW8tdXAnOidmMGE2JywnaGFuZC1vLWRvd24nOidmMGE3JywnYXJyb3ctY2lyY2xlLWxlZnQnOidmMGE4JywnYXJyb3ctY2lyY2xlLXJpZ2h0JzonZjBhOScsJ2Fycm93LWNpcmNsZS11cCc6J2YwYWEnLCdhcnJvdy1jaXJjbGUtZG93bic6J2YwYWInLCdnbG9iZSc6J2YwYWMnLCd3cmVuY2gnOidmMGFkJywndGFza3MnOidmMGFlJywnZmlsdGVyJzonZjBiMCcsJ2JyaWVmY2FzZSc6J2YwYjEnLCdhcnJvd3MtYWx0JzonZjBiMicsJ2dyb3VwLHVzZXJzJzonZjBjMCcsJ2NoYWluLGxpbmsnOidmMGMxJywnY2xvdWQnOidmMGMyJywnZmxhc2snOidmMGMzJywnY3V0LHNjaXNzb3JzJzonZjBjNCcsJ2NvcHksZmlsZXMtbyc6J2YwYzUnLCdwYXBlcmNsaXAnOidmMGM2Jywnc2F2ZSxmbG9wcHktbyc6J2YwYzcnLCdzcXVhcmUnOidmMGM4JywnbmF2aWNvbixyZW9yZGVyLGJhcnMnOidmMGM5JywnbGlzdC11bCc6J2YwY2EnLCdsaXN0LW9sJzonZjBjYicsJ3N0cmlrZXRocm91Z2gnOidmMGNjJywndW5kZXJsaW5lJzonZjBjZCcsJ3RhYmxlJzonZjBjZScsJ21hZ2ljJzonZjBkMCcsJ3RydWNrJzonZjBkMScsJ3BpbnRlcmVzdCc6J2YwZDInLCdwaW50ZXJlc3Qtc3F1YXJlJzonZjBkMycsJ2dvb2dsZS1wbHVzLXNxdWFyZSc6J2YwZDQnLCdnb29nbGUtcGx1cyc6J2YwZDUnLCdtb25leSc6J2YwZDYnLCdjYXJldC1kb3duJzonZjBkNycsJ2NhcmV0LXVwJzonZjBkOCcsJ2NhcmV0LWxlZnQnOidmMGQ5JywnY2FyZXQtcmlnaHQnOidmMGRhJywnY29sdW1ucyc6J2YwZGInLCd1bnNvcnRlZCxzb3J0JzonZjBkYycsJ3NvcnQtZG93bixzb3J0LWRlc2MnOidmMGRkJywnc29ydC11cCxzb3J0LWFzYyc6J2YwZGUnLCdlbnZlbG9wZSc6J2YwZTAnLCdsaW5rZWRpbic6J2YwZTEnLCdyb3RhdGUtbGVmdCx1bmRvJzonZjBlMicsJ2xlZ2FsLGdhdmVsJzonZjBlMycsJ2Rhc2hib2FyZCx0YWNob21ldGVyJzonZjBlNCcsJ2NvbW1lbnQtbyc6J2YwZTUnLCdjb21tZW50cy1vJzonZjBlNicsJ2ZsYXNoLGJvbHQnOidmMGU3Jywnc2l0ZW1hcCc6J2YwZTgnLCd1bWJyZWxsYSc6J2YwZTknLCdwYXN0ZSxjbGlwYm9hcmQnOidmMGVhJywnbGlnaHRidWxiLW8nOidmMGViJywnZXhjaGFuZ2UnOidmMGVjJywnY2xvdWQtZG93bmxvYWQnOidmMGVkJywnY2xvdWQtdXBsb2FkJzonZjBlZScsJ3VzZXItbWQnOidmMGYwJywnc3RldGhvc2NvcGUnOidmMGYxJywnc3VpdGNhc2UnOidmMGYyJywnYmVsbC1vJzonZjBhMicsJ2NvZmZlZSc6J2YwZjQnLCdjdXRsZXJ5JzonZjBmNScsJ2ZpbGUtdGV4dC1vJzonZjBmNicsJ2J1aWxkaW5nLW8nOidmMGY3JywnaG9zcGl0YWwtbyc6J2YwZjgnLCdhbWJ1bGFuY2UnOidmMGY5JywnbWVka2l0JzonZjBmYScsJ2ZpZ2h0ZXItamV0JzonZjBmYicsJ2JlZXInOidmMGZjJywnaC1zcXVhcmUnOidmMGZkJywncGx1cy1zcXVhcmUnOidmMGZlJywnYW5nbGUtZG91YmxlLWxlZnQnOidmMTAwJywnYW5nbGUtZG91YmxlLXJpZ2h0JzonZjEwMScsJ2FuZ2xlLWRvdWJsZS11cCc6J2YxMDInLCdhbmdsZS1kb3VibGUtZG93bic6J2YxMDMnLCdhbmdsZS1sZWZ0JzonZjEwNCcsJ2FuZ2xlLXJpZ2h0JzonZjEwNScsJ2FuZ2xlLXVwJzonZjEwNicsJ2FuZ2xlLWRvd24nOidmMTA3JywnZGVza3RvcCc6J2YxMDgnLCdsYXB0b3AnOidmMTA5JywndGFibGV0JzonZjEwYScsJ21vYmlsZS1waG9uZSxtb2JpbGUnOidmMTBiJywnY2lyY2xlLW8nOidmMTBjJywncXVvdGUtbGVmdCc6J2YxMGQnLCdxdW90ZS1yaWdodCc6J2YxMGUnLCdzcGlubmVyJzonZjExMCcsJ2NpcmNsZSc6J2YxMTEnLCdtYWlsLXJlcGx5LHJlcGx5JzonZjExMicsJ2dpdGh1Yi1hbHQnOidmMTEzJywnZm9sZGVyLW8nOidmMTE0JywnZm9sZGVyLW9wZW4tbyc6J2YxMTUnLCdzbWlsZS1vJzonZjExOCcsJ2Zyb3duLW8nOidmMTE5JywnbWVoLW8nOidmMTFhJywnZ2FtZXBhZCc6J2YxMWInLCdrZXlib2FyZC1vJzonZjExYycsJ2ZsYWctbyc6J2YxMWQnLCdmbGFnLWNoZWNrZXJlZCc6J2YxMWUnLCd0ZXJtaW5hbCc6J2YxMjAnLCdjb2RlJzonZjEyMScsJ21haWwtcmVwbHktYWxsLHJlcGx5LWFsbCc6J2YxMjInLCdzdGFyLWhhbGYtZW1wdHksc3Rhci1oYWxmLWZ1bGwsc3Rhci1oYWxmLW8nOidmMTIzJywnbG9jYXRpb24tYXJyb3cnOidmMTI0JywnY3JvcCc6J2YxMjUnLCdjb2RlLWZvcmsnOidmMTI2JywndW5saW5rLGNoYWluLWJyb2tlbic6J2YxMjcnLCdxdWVzdGlvbic6J2YxMjgnLCdpbmZvJzonZjEyOScsJ2V4Y2xhbWF0aW9uJzonZjEyYScsJ3N1cGVyc2NyaXB0JzonZjEyYicsJ3N1YnNjcmlwdCc6J2YxMmMnLCdlcmFzZXInOidmMTJkJywncHV6emxlLXBpZWNlJzonZjEyZScsJ21pY3JvcGhvbmUnOidmMTMwJywnbWljcm9waG9uZS1zbGFzaCc6J2YxMzEnLCdzaGllbGQnOidmMTMyJywnY2FsZW5kYXItbyc6J2YxMzMnLCdmaXJlLWV4dGluZ3Vpc2hlcic6J2YxMzQnLCdyb2NrZXQnOidmMTM1JywnbWF4Y2RuJzonZjEzNicsJ2NoZXZyb24tY2lyY2xlLWxlZnQnOidmMTM3JywnY2hldnJvbi1jaXJjbGUtcmlnaHQnOidmMTM4JywnY2hldnJvbi1jaXJjbGUtdXAnOidmMTM5JywnY2hldnJvbi1jaXJjbGUtZG93bic6J2YxM2EnLCdodG1sNSc6J2YxM2InLCdjc3MzJzonZjEzYycsJ2FuY2hvcic6J2YxM2QnLCd1bmxvY2stYWx0JzonZjEzZScsJ2J1bGxzZXllJzonZjE0MCcsJ2VsbGlwc2lzLWgnOidmMTQxJywnZWxsaXBzaXMtdic6J2YxNDInLCdyc3Mtc3F1YXJlJzonZjE0MycsJ3BsYXktY2lyY2xlJzonZjE0NCcsJ3RpY2tldCc6J2YxNDUnLCdtaW51cy1zcXVhcmUnOidmMTQ2JywnbWludXMtc3F1YXJlLW8nOidmMTQ3JywnbGV2ZWwtdXAnOidmMTQ4JywnbGV2ZWwtZG93bic6J2YxNDknLCdjaGVjay1zcXVhcmUnOidmMTRhJywncGVuY2lsLXNxdWFyZSc6J2YxNGInLCdleHRlcm5hbC1saW5rLXNxdWFyZSc6J2YxNGMnLCdzaGFyZS1zcXVhcmUnOidmMTRkJywnY29tcGFzcyc6J2YxNGUnLCd0b2dnbGUtZG93bixjYXJldC1zcXVhcmUtby1kb3duJzonZjE1MCcsJ3RvZ2dsZS11cCxjYXJldC1zcXVhcmUtby11cCc6J2YxNTEnLCd0b2dnbGUtcmlnaHQsY2FyZXQtc3F1YXJlLW8tcmlnaHQnOidmMTUyJywnZXVybyxldXInOidmMTUzJywnZ2JwJzonZjE1NCcsJ2RvbGxhcix1c2QnOidmMTU1JywncnVwZWUsaW5yJzonZjE1NicsJ2NueSxybWIseWVuLGpweSc6J2YxNTcnLCdydWJsZSxyb3VibGUscnViJzonZjE1OCcsJ3dvbixrcncnOidmMTU5JywnYml0Y29pbixidGMnOidmMTVhJywnZmlsZSc6J2YxNWInLCdmaWxlLXRleHQnOidmMTVjJywnc29ydC1hbHBoYS1hc2MnOidmMTVkJywnc29ydC1hbHBoYS1kZXNjJzonZjE1ZScsJ3NvcnQtYW1vdW50LWFzYyc6J2YxNjAnLCdzb3J0LWFtb3VudC1kZXNjJzonZjE2MScsJ3NvcnQtbnVtZXJpYy1hc2MnOidmMTYyJywnc29ydC1udW1lcmljLWRlc2MnOidmMTYzJywndGh1bWJzLXVwJzonZjE2NCcsJ3RodW1icy1kb3duJzonZjE2NScsJ3lvdXR1YmUtc3F1YXJlJzonZjE2NicsJ3lvdXR1YmUnOidmMTY3JywneGluZyc6J2YxNjgnLCd4aW5nLXNxdWFyZSc6J2YxNjknLCd5b3V0dWJlLXBsYXknOidmMTZhJywnZHJvcGJveCc6J2YxNmInLCdzdGFjay1vdmVyZmxvdyc6J2YxNmMnLCdpbnN0YWdyYW0nOidmMTZkJywnZmxpY2tyJzonZjE2ZScsJ2Fkbic6J2YxNzAnLCdiaXRidWNrZXQnOidmMTcxJywnYml0YnVja2V0LXNxdWFyZSc6J2YxNzInLCd0dW1ibHInOidmMTczJywndHVtYmxyLXNxdWFyZSc6J2YxNzQnLCdsb25nLWFycm93LWRvd24nOidmMTc1JywnbG9uZy1hcnJvdy11cCc6J2YxNzYnLCdsb25nLWFycm93LWxlZnQnOidmMTc3JywnbG9uZy1hcnJvdy1yaWdodCc6J2YxNzgnLCdhcHBsZSc6J2YxNzknLCd3aW5kb3dzJzonZjE3YScsJ2FuZHJvaWQnOidmMTdiJywnbGludXgnOidmMTdjJywnZHJpYmJibGUnOidmMTdkJywnc2t5cGUnOidmMTdlJywnZm91cnNxdWFyZSc6J2YxODAnLCd0cmVsbG8nOidmMTgxJywnZmVtYWxlJzonZjE4MicsJ21hbGUnOidmMTgzJywnZ2l0dGlwLGdyYXRpcGF5JzonZjE4NCcsJ3N1bi1vJzonZjE4NScsJ21vb24tbyc6J2YxODYnLCdhcmNoaXZlJzonZjE4NycsJ2J1Zyc6J2YxODgnLCd2ayc6J2YxODknLCd3ZWlibyc6J2YxOGEnLCdyZW5yZW4nOidmMThiJywncGFnZWxpbmVzJzonZjE4YycsJ3N0YWNrLWV4Y2hhbmdlJzonZjE4ZCcsJ2Fycm93LWNpcmNsZS1vLXJpZ2h0JzonZjE4ZScsJ2Fycm93LWNpcmNsZS1vLWxlZnQnOidmMTkwJywndG9nZ2xlLWxlZnQsY2FyZXQtc3F1YXJlLW8tbGVmdCc6J2YxOTEnLCdkb3QtY2lyY2xlLW8nOidmMTkyJywnd2hlZWxjaGFpcic6J2YxOTMnLCd2aW1lby1zcXVhcmUnOidmMTk0JywndHVya2lzaC1saXJhLHRyeSc6J2YxOTUnLCdwbHVzLXNxdWFyZS1vJzonZjE5NicsJ3NwYWNlLXNodXR0bGUnOidmMTk3Jywnc2xhY2snOidmMTk4JywnZW52ZWxvcGUtc3F1YXJlJzonZjE5OScsJ3dvcmRwcmVzcyc6J2YxOWEnLCdvcGVuaWQnOidmMTliJywnaW5zdGl0dXRpb24sYmFuayx1bml2ZXJzaXR5JzonZjE5YycsJ21vcnRhci1ib2FyZCxncmFkdWF0aW9uLWNhcCc6J2YxOWQnLCd5YWhvbyc6J2YxOWUnLCdnb29nbGUnOidmMWEwJywncmVkZGl0JzonZjFhMScsJ3JlZGRpdC1zcXVhcmUnOidmMWEyJywnc3R1bWJsZXVwb24tY2lyY2xlJzonZjFhMycsJ3N0dW1ibGV1cG9uJzonZjFhNCcsJ2RlbGljaW91cyc6J2YxYTUnLCdkaWdnJzonZjFhNicsJ3BpZWQtcGlwZXItcHAnOidmMWE3JywncGllZC1waXBlci1hbHQnOidmMWE4JywnZHJ1cGFsJzonZjFhOScsJ2pvb21sYSc6J2YxYWEnLCdsYW5ndWFnZSc6J2YxYWInLCdmYXgnOidmMWFjJywnYnVpbGRpbmcnOidmMWFkJywnY2hpbGQnOidmMWFlJywncGF3JzonZjFiMCcsJ3Nwb29uJzonZjFiMScsJ2N1YmUnOidmMWIyJywnY3ViZXMnOidmMWIzJywnYmVoYW5jZSc6J2YxYjQnLCdiZWhhbmNlLXNxdWFyZSc6J2YxYjUnLCdzdGVhbSc6J2YxYjYnLCdzdGVhbS1zcXVhcmUnOidmMWI3JywncmVjeWNsZSc6J2YxYjgnLCdhdXRvbW9iaWxlLGNhcic6J2YxYjknLCdjYWIsdGF4aSc6J2YxYmEnLCd0cmVlJzonZjFiYicsJ3Nwb3RpZnknOidmMWJjJywnZGV2aWFudGFydCc6J2YxYmQnLCdzb3VuZGNsb3VkJzonZjFiZScsJ2RhdGFiYXNlJzonZjFjMCcsJ2ZpbGUtcGRmLW8nOidmMWMxJywnZmlsZS13b3JkLW8nOidmMWMyJywnZmlsZS1leGNlbC1vJzonZjFjMycsJ2ZpbGUtcG93ZXJwb2ludC1vJzonZjFjNCcsJ2ZpbGUtcGhvdG8tbyxmaWxlLXBpY3R1cmUtbyxmaWxlLWltYWdlLW8nOidmMWM1JywnZmlsZS16aXAtbyxmaWxlLWFyY2hpdmUtbyc6J2YxYzYnLCdmaWxlLXNvdW5kLW8sZmlsZS1hdWRpby1vJzonZjFjNycsJ2ZpbGUtbW92aWUtbyxmaWxlLXZpZGVvLW8nOidmMWM4JywnZmlsZS1jb2RlLW8nOidmMWM5JywndmluZSc6J2YxY2EnLCdjb2RlcGVuJzonZjFjYicsJ2pzZmlkZGxlJzonZjFjYycsJ2xpZmUtYm91eSxsaWZlLWJ1b3ksbGlmZS1zYXZlcixzdXBwb3J0LGxpZmUtcmluZyc6J2YxY2QnLCdjaXJjbGUtby1ub3RjaCc6J2YxY2UnLCdyYSxyZXNpc3RhbmNlLHJlYmVsJzonZjFkMCcsJ2dlLGVtcGlyZSc6J2YxZDEnLCdnaXQtc3F1YXJlJzonZjFkMicsJ2dpdCc6J2YxZDMnLCd5LWNvbWJpbmF0b3Itc3F1YXJlLHljLXNxdWFyZSxoYWNrZXItbmV3cyc6J2YxZDQnLCd0ZW5jZW50LXdlaWJvJzonZjFkNScsJ3FxJzonZjFkNicsJ3dlY2hhdCx3ZWl4aW4nOidmMWQ3Jywnc2VuZCxwYXBlci1wbGFuZSc6J2YxZDgnLCdzZW5kLW8scGFwZXItcGxhbmUtbyc6J2YxZDknLCdoaXN0b3J5JzonZjFkYScsJ2NpcmNsZS10aGluJzonZjFkYicsJ2hlYWRlcic6J2YxZGMnLCdwYXJhZ3JhcGgnOidmMWRkJywnc2xpZGVycyc6J2YxZGUnLCdzaGFyZS1hbHQnOidmMWUwJywnc2hhcmUtYWx0LXNxdWFyZSc6J2YxZTEnLCdib21iJzonZjFlMicsJ3NvY2Nlci1iYWxsLW8sZnV0Ym9sLW8nOidmMWUzJywndHR5JzonZjFlNCcsJ2Jpbm9jdWxhcnMnOidmMWU1JywncGx1Zyc6J2YxZTYnLCdzbGlkZXNoYXJlJzonZjFlNycsJ3R3aXRjaCc6J2YxZTgnLCd5ZWxwJzonZjFlOScsJ25ld3NwYXBlci1vJzonZjFlYScsJ3dpZmknOidmMWViJywnY2FsY3VsYXRvcic6J2YxZWMnLCdwYXlwYWwnOidmMWVkJywnZ29vZ2xlLXdhbGxldCc6J2YxZWUnLCdjYy12aXNhJzonZjFmMCcsJ2NjLW1hc3RlcmNhcmQnOidmMWYxJywnY2MtZGlzY292ZXInOidmMWYyJywnY2MtYW1leCc6J2YxZjMnLCdjYy1wYXlwYWwnOidmMWY0JywnY2Mtc3RyaXBlJzonZjFmNScsJ2JlbGwtc2xhc2gnOidmMWY2JywnYmVsbC1zbGFzaC1vJzonZjFmNycsJ3RyYXNoJzonZjFmOCcsJ2NvcHlyaWdodCc6J2YxZjknLCdhdCc6J2YxZmEnLCdleWVkcm9wcGVyJzonZjFmYicsJ3BhaW50LWJydXNoJzonZjFmYycsJ2JpcnRoZGF5LWNha2UnOidmMWZkJywnYXJlYS1jaGFydCc6J2YxZmUnLCdwaWUtY2hhcnQnOidmMjAwJywnbGluZS1jaGFydCc6J2YyMDEnLCdsYXN0Zm0nOidmMjAyJywnbGFzdGZtLXNxdWFyZSc6J2YyMDMnLCd0b2dnbGUtb2ZmJzonZjIwNCcsJ3RvZ2dsZS1vbic6J2YyMDUnLCdiaWN5Y2xlJzonZjIwNicsJ2J1cyc6J2YyMDcnLCdpb3hob3N0JzonZjIwOCcsJ2FuZ2VsbGlzdCc6J2YyMDknLCdjYyc6J2YyMGEnLCdzaGVrZWwsc2hlcWVsLGlscyc6J2YyMGInLCdtZWFucGF0aCc6J2YyMGMnLCdidXlzZWxsYWRzJzonZjIwZCcsJ2Nvbm5lY3RkZXZlbG9wJzonZjIwZScsJ2Rhc2hjdWJlJzonZjIxMCcsJ2ZvcnVtYmVlJzonZjIxMScsJ2xlYW5wdWInOidmMjEyJywnc2VsbHN5JzonZjIxMycsJ3NoaXJ0c2luYnVsayc6J2YyMTQnLCdzaW1wbHlidWlsdCc6J2YyMTUnLCdza3lhdGxhcyc6J2YyMTYnLCdjYXJ0LXBsdXMnOidmMjE3JywnY2FydC1hcnJvdy1kb3duJzonZjIxOCcsJ2RpYW1vbmQnOidmMjE5Jywnc2hpcCc6J2YyMWEnLCd1c2VyLXNlY3JldCc6J2YyMWInLCdtb3RvcmN5Y2xlJzonZjIxYycsJ3N0cmVldC12aWV3JzonZjIxZCcsJ2hlYXJ0YmVhdCc6J2YyMWUnLCd2ZW51cyc6J2YyMjEnLCdtYXJzJzonZjIyMicsJ21lcmN1cnknOidmMjIzJywnaW50ZXJzZXgsdHJhbnNnZW5kZXInOidmMjI0JywndHJhbnNnZW5kZXItYWx0JzonZjIyNScsJ3ZlbnVzLWRvdWJsZSc6J2YyMjYnLCdtYXJzLWRvdWJsZSc6J2YyMjcnLCd2ZW51cy1tYXJzJzonZjIyOCcsJ21hcnMtc3Ryb2tlJzonZjIyOScsJ21hcnMtc3Ryb2tlLXYnOidmMjJhJywnbWFycy1zdHJva2UtaCc6J2YyMmInLCduZXV0ZXInOidmMjJjJywnZ2VuZGVybGVzcyc6J2YyMmQnLCdmYWNlYm9vay1vZmZpY2lhbCc6J2YyMzAnLCdwaW50ZXJlc3QtcCc6J2YyMzEnLCd3aGF0c2FwcCc6J2YyMzInLCdzZXJ2ZXInOidmMjMzJywndXNlci1wbHVzJzonZjIzNCcsJ3VzZXItdGltZXMnOidmMjM1JywnaG90ZWwsYmVkJzonZjIzNicsJ3ZpYWNvaW4nOidmMjM3JywndHJhaW4nOidmMjM4Jywnc3Vid2F5JzonZjIzOScsJ21lZGl1bSc6J2YyM2EnLCd5Yyx5LWNvbWJpbmF0b3InOidmMjNiJywnb3B0aW4tbW9uc3Rlcic6J2YyM2MnLCdvcGVuY2FydCc6J2YyM2QnLCdleHBlZGl0ZWRzc2wnOidmMjNlJywnYmF0dGVyeS00LGJhdHRlcnktZnVsbCc6J2YyNDAnLCdiYXR0ZXJ5LTMsYmF0dGVyeS10aHJlZS1xdWFydGVycyc6J2YyNDEnLCdiYXR0ZXJ5LTIsYmF0dGVyeS1oYWxmJzonZjI0MicsJ2JhdHRlcnktMSxiYXR0ZXJ5LXF1YXJ0ZXInOidmMjQzJywnYmF0dGVyeS0wLGJhdHRlcnktZW1wdHknOidmMjQ0JywnbW91c2UtcG9pbnRlcic6J2YyNDUnLCdpLWN1cnNvcic6J2YyNDYnLCdvYmplY3QtZ3JvdXAnOidmMjQ3Jywnb2JqZWN0LXVuZ3JvdXAnOidmMjQ4Jywnc3RpY2t5LW5vdGUnOidmMjQ5Jywnc3RpY2t5LW5vdGUtbyc6J2YyNGEnLCdjYy1qY2InOidmMjRiJywnY2MtZGluZXJzLWNsdWInOidmMjRjJywnY2xvbmUnOidmMjRkJywnYmFsYW5jZS1zY2FsZSc6J2YyNGUnLCdob3VyZ2xhc3Mtbyc6J2YyNTAnLCdob3VyZ2xhc3MtMSxob3VyZ2xhc3Mtc3RhcnQnOidmMjUxJywnaG91cmdsYXNzLTIsaG91cmdsYXNzLWhhbGYnOidmMjUyJywnaG91cmdsYXNzLTMsaG91cmdsYXNzLWVuZCc6J2YyNTMnLCdob3VyZ2xhc3MnOidmMjU0JywnaGFuZC1ncmFiLW8saGFuZC1yb2NrLW8nOidmMjU1JywnaGFuZC1zdG9wLW8saGFuZC1wYXBlci1vJzonZjI1NicsJ2hhbmQtc2Npc3NvcnMtbyc6J2YyNTcnLCdoYW5kLWxpemFyZC1vJzonZjI1OCcsJ2hhbmQtc3BvY2stbyc6J2YyNTknLCdoYW5kLXBvaW50ZXItbyc6J2YyNWEnLCdoYW5kLXBlYWNlLW8nOidmMjViJywndHJhZGVtYXJrJzonZjI1YycsJ3JlZ2lzdGVyZWQnOidmMjVkJywnY3JlYXRpdmUtY29tbW9ucyc6J2YyNWUnLCdnZyc6J2YyNjAnLCdnZy1jaXJjbGUnOidmMjYxJywndHJpcGFkdmlzb3InOidmMjYyJywnb2Rub2tsYXNzbmlraSc6J2YyNjMnLCdvZG5va2xhc3NuaWtpLXNxdWFyZSc6J2YyNjQnLCdnZXQtcG9ja2V0JzonZjI2NScsJ3dpa2lwZWRpYS13JzonZjI2NicsJ3NhZmFyaSc6J2YyNjcnLCdjaHJvbWUnOidmMjY4JywnZmlyZWZveCc6J2YyNjknLCdvcGVyYSc6J2YyNmEnLCdpbnRlcm5ldC1leHBsb3Jlcic6J2YyNmInLCd0dix0ZWxldmlzaW9uJzonZjI2YycsJ2NvbnRhbyc6J2YyNmQnLCc1MDBweCc6J2YyNmUnLCdhbWF6b24nOidmMjcwJywnY2FsZW5kYXItcGx1cy1vJzonZjI3MScsJ2NhbGVuZGFyLW1pbnVzLW8nOidmMjcyJywnY2FsZW5kYXItdGltZXMtbyc6J2YyNzMnLCdjYWxlbmRhci1jaGVjay1vJzonZjI3NCcsJ2luZHVzdHJ5JzonZjI3NScsJ21hcC1waW4nOidmMjc2JywnbWFwLXNpZ25zJzonZjI3NycsJ21hcC1vJzonZjI3OCcsJ21hcCc6J2YyNzknLCdjb21tZW50aW5nJzonZjI3YScsJ2NvbW1lbnRpbmctbyc6J2YyN2InLCdob3V6eic6J2YyN2MnLCd2aW1lbyc6J2YyN2QnLCdibGFjay10aWUnOidmMjdlJywnZm9udGljb25zJzonZjI4MCcsJ3JlZGRpdC1hbGllbic6J2YyODEnLCdlZGdlJzonZjI4MicsJ2NyZWRpdC1jYXJkLWFsdCc6J2YyODMnLCdjb2RpZXBpZSc6J2YyODQnLCdtb2R4JzonZjI4NScsJ2ZvcnQtYXdlc29tZSc6J2YyODYnLCd1c2InOidmMjg3JywncHJvZHVjdC1odW50JzonZjI4OCcsJ21peGNsb3VkJzonZjI4OScsJ3NjcmliZCc6J2YyOGEnLCdwYXVzZS1jaXJjbGUnOidmMjhiJywncGF1c2UtY2lyY2xlLW8nOidmMjhjJywnc3RvcC1jaXJjbGUnOidmMjhkJywnc3RvcC1jaXJjbGUtbyc6J2YyOGUnLCdzaG9wcGluZy1iYWcnOidmMjkwJywnc2hvcHBpbmctYmFza2V0JzonZjI5MScsJ2hhc2h0YWcnOidmMjkyJywnYmx1ZXRvb3RoJzonZjI5MycsJ2JsdWV0b290aC1iJzonZjI5NCcsJ3BlcmNlbnQnOidmMjk1JywnZ2l0bGFiJzonZjI5NicsJ3dwYmVnaW5uZXInOidmMjk3Jywnd3Bmb3Jtcyc6J2YyOTgnLCdlbnZpcmEnOidmMjk5JywndW5pdmVyc2FsLWFjY2Vzcyc6J2YyOWEnLCd3aGVlbGNoYWlyLWFsdCc6J2YyOWInLCdxdWVzdGlvbi1jaXJjbGUtbyc6J2YyOWMnLCdibGluZCc6J2YyOWQnLCdhdWRpby1kZXNjcmlwdGlvbic6J2YyOWUnLCd2b2x1bWUtY29udHJvbC1waG9uZSc6J2YyYTAnLCdicmFpbGxlJzonZjJhMScsJ2Fzc2lzdGl2ZS1saXN0ZW5pbmctc3lzdGVtcyc6J2YyYTInLCdhc2wtaW50ZXJwcmV0aW5nLGFtZXJpY2FuLXNpZ24tbGFuZ3VhZ2UtaW50ZXJwcmV0aW5nJzonZjJhMycsJ2RlYWZuZXNzLGhhcmQtb2YtaGVhcmluZyxkZWFmJzonZjJhNCcsJ2dsaWRlJzonZjJhNScsJ2dsaWRlLWcnOidmMmE2Jywnc2lnbmluZyxzaWduLWxhbmd1YWdlJzonZjJhNycsJ2xvdy12aXNpb24nOidmMmE4JywndmlhZGVvJzonZjJhOScsJ3ZpYWRlby1zcXVhcmUnOidmMmFhJywnc25hcGNoYXQnOidmMmFiJywnc25hcGNoYXQtZ2hvc3QnOidmMmFjJywnc25hcGNoYXQtc3F1YXJlJzonZjJhZCcsJ3BpZWQtcGlwZXInOidmMmFlJywnZmlyc3Qtb3JkZXInOidmMmIwJywneW9hc3QnOidmMmIxJywndGhlbWVpc2xlJzonZjJiMicsJ2dvb2dsZS1wbHVzLWNpcmNsZSxnb29nbGUtcGx1cy1vZmZpY2lhbCc6J2YyYjMnLCdmYSxmb250LWF3ZXNvbWUnOidmMmI0J307XHJcbiAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGljb24oZCkge1xyXG4gICAgICAgIHZhciBjb2RlO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5pY29uTWFwICYmIG9wdGlvbnMuc2hvd0ljb25zICYmIG9wdGlvbnMuaWNvbnMpIHtcclxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuaWNvbnNbZC5sYWJlbHNbMF1dICYmIG9wdGlvbnMuaWNvbk1hcFtvcHRpb25zLmljb25zW2QubGFiZWxzWzBdXV0pIHtcclxuICAgICAgICAgICAgICAgIGNvZGUgPSBvcHRpb25zLmljb25NYXBbb3B0aW9ucy5pY29uc1tkLmxhYmVsc1swXV1dO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuaWNvbk1hcFtkLmxhYmVsc1swXV0pIHtcclxuICAgICAgICAgICAgICAgIGNvZGUgPSBvcHRpb25zLmljb25NYXBbZC5sYWJlbHNbMF1dO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuaWNvbnNbZC5sYWJlbHNbMF1dKSB7XHJcbiAgICAgICAgICAgICAgICBjb2RlID0gb3B0aW9ucy5pY29uc1tkLmxhYmVsc1swXV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjb2RlO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGltYWdlKGQpIHtcclxuICAgICAgICB2YXIgaSwgaW1hZ2VzRm9yTGFiZWwsIGltZywgaW1nTGV2ZWwsIGxhYmVsLCBsYWJlbFByb3BlcnR5VmFsdWUsIHByb3BlcnR5LCB2YWx1ZTtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaW1hZ2VzKSB7XHJcbiAgICAgICAgICAgIGltYWdlc0ZvckxhYmVsID0gb3B0aW9ucy5pbWFnZU1hcFtkLmxhYmVsc1swXV07XHJcblxyXG4gICAgICAgICAgICBpZiAoaW1hZ2VzRm9yTGFiZWwpIHtcclxuICAgICAgICAgICAgICAgIGltZ0xldmVsID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgaW1hZ2VzRm9yTGFiZWwubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbFByb3BlcnR5VmFsdWUgPSBpbWFnZXNGb3JMYWJlbFtpXS5zcGxpdCgnfCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGxhYmVsUHJvcGVydHlWYWx1ZS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGxhYmVsUHJvcGVydHlWYWx1ZVsyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5ID0gbGFiZWxQcm9wZXJ0eVZhbHVlWzFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWwgPSBsYWJlbFByb3BlcnR5VmFsdWVbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZC5sYWJlbHNbMF0gPT09IGxhYmVsICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICghcHJvcGVydHkgfHwgZC5wcm9wZXJ0aWVzW3Byb3BlcnR5XSAhPT0gdW5kZWZpbmVkKSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoIXZhbHVlIHx8IGQucHJvcGVydGllc1twcm9wZXJ0eV0gPT09IHZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFiZWxQcm9wZXJ0eVZhbHVlLmxlbmd0aCA+IGltZ0xldmVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbWcgPSBvcHRpb25zLmltYWdlc1tpbWFnZXNGb3JMYWJlbFtpXV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbWdMZXZlbCA9IGxhYmVsUHJvcGVydHlWYWx1ZS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpbWc7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaW5pdChfc2VsZWN0b3IsIF9vcHRpb25zKSB7XHJcbiAgICAgICAgaW5pdEljb25NYXAoKTtcclxuXHJcbiAgICAgICAgbWVyZ2Uob3B0aW9ucywgX29wdGlvbnMpO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5pY29ucykge1xyXG4gICAgICAgICAgICBvcHRpb25zLnNob3dJY29ucyA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIW9wdGlvbnMubWluQ29sbGlzaW9uKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMubWluQ29sbGlzaW9uID0gb3B0aW9ucy5ub2RlUmFkaXVzICogMjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGluaXRJbWFnZU1hcCgpO1xyXG5cclxuICAgICAgICBzZWxlY3RvciA9IF9zZWxlY3RvcjtcclxuXHJcbiAgICAgICAgY29udGFpbmVyID0gZDMuc2VsZWN0KHNlbGVjdG9yKTtcclxuXHJcbiAgICAgICAgY29udGFpbmVyLmF0dHIoJ2NsYXNzJywgJ25lbzRqZDMnKVxyXG4gICAgICAgICAgICAgICAgIC5odG1sKCcnKTtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5mb1BhbmVsKSB7XHJcbiAgICAgICAgICAgIGluZm8gPSBhcHBlbmRJbmZvUGFuZWwoY29udGFpbmVyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFwcGVuZEdyYXBoKGNvbnRhaW5lcik7XHJcblxyXG4gICAgICAgIHNpbXVsYXRpb24gPSBpbml0U2ltdWxhdGlvbigpO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5uZW80akRhdGEpIHtcclxuICAgICAgICAgICAgbG9hZE5lbzRqRGF0YShvcHRpb25zLm5lbzRqRGF0YSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zLm5lbzRqRGF0YVVybCkge1xyXG4gICAgICAgICAgICBsb2FkTmVvNGpEYXRhRnJvbVVybChvcHRpb25zLm5lbzRqRGF0YVVybCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3I6IGJvdGggbmVvNGpEYXRhIGFuZCBuZW80akRhdGFVcmwgYXJlIGVtcHR5IScpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpbml0SWNvbk1hcCgpIHtcclxuICAgICAgICBPYmplY3Qua2V5cyhvcHRpb25zLmljb25NYXApLmZvckVhY2goZnVuY3Rpb24oa2V5LCBpbmRleCkge1xyXG4gICAgICAgICAgICB2YXIga2V5cyA9IGtleS5zcGxpdCgnLCcpLFxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBvcHRpb25zLmljb25NYXBba2V5XTtcclxuXHJcbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcclxuICAgICAgICAgICAgICAgIG9wdGlvbnMuaWNvbk1hcFtrZXldID0gdmFsdWU7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGluaXRJbWFnZU1hcCgpIHtcclxuICAgICAgICB2YXIga2V5LCBrZXlzLCBzZWxlY3RvcjtcclxuXHJcbiAgICAgICAgZm9yIChrZXkgaW4gb3B0aW9ucy5pbWFnZXMpIHtcclxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuaW1hZ2VzLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgICAgICAgICAgIGtleXMgPSBrZXkuc3BsaXQoJ3wnKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIW9wdGlvbnMuaW1hZ2VNYXBba2V5c1swXV0pIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmltYWdlTWFwW2tleXNbMF1dID0gW2tleV07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuaW1hZ2VNYXBba2V5c1swXV0ucHVzaChrZXkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGluaXRTaW11bGF0aW9uKCkge1xyXG4gICAgICAgIHZhciBzaW11bGF0aW9uID0gZDMuZm9yY2VTaW11bGF0aW9uKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAudmVsb2NpdHlEZWNheShfb3B0aW9ucy52ZWxvY2l0eURlY2F5IHx8IG9wdGlvbnMudmVsb2NpdHlEZWNheSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAuYWxwaGFEZWNheShfb3B0aW9ucy5hbHBoYURlY2F5IHx8IG9wdGlvbnMuYWxwaGFEZWNheSlcclxuXHJcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZvcmNlKCd4JywgZDMuZm9yY2UoKS5zdHJlbmd0aCgwLjAwMikpXHJcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZvcmNlKCd5JywgZDMuZm9yY2UoKS5zdHJlbmd0aCgwLjAwMikpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5mb3JjZSgnY29sbGlkZScsIGQzLmZvcmNlQ29sbGlkZSgpLnJhZGl1cyhmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5taW5Db2xsaXNpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLml0ZXJhdGlvbnMoMikpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5mb3JjZSgnY2hhcmdlJywgZDMuZm9yY2VNYW55Qm9keSgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAuZm9yY2UoJ2xpbmsnLCBkMy5mb3JjZUxpbmsoKS5pZChmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5pZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5mb3JjZSgnY2VudGVyJywgZDMuZm9yY2VDZW50ZXIoc3ZnLm5vZGUoKS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQuY2xpZW50V2lkdGggLyAyLCBzdmcubm9kZSgpLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5jbGllbnRIZWlnaHQgLyAyKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLm9uKCd0aWNrJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aWNrKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5vbignZW5kJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy56b29tRml0ICYmICFqdXN0TG9hZGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAganVzdExvYWRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgem9vbUZpdCgyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBzaW11bGF0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGxvYWROZW80akRhdGEoKSB7XHJcbiAgICAgICAgbm9kZXMgPSBbXTtcclxuICAgICAgICByZWxhdGlvbnNoaXBzID0gW107XHJcblxyXG4gICAgICAgIHVwZGF0ZVdpdGhOZW80akRhdGEob3B0aW9ucy5uZW80akRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGxvYWROZW80akRhdGFGcm9tVXJsKG5lbzRqRGF0YVVybCkge1xyXG4gICAgICAgIG5vZGVzID0gW107XHJcbiAgICAgICAgcmVsYXRpb25zaGlwcyA9IFtdO1xyXG5cclxuICAgICAgICBkMy5qc29uKG5lbzRqRGF0YVVybCwgZnVuY3Rpb24oZXJyb3IsIGRhdGEpIHtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdXBkYXRlV2l0aE5lbzRqRGF0YShkYXRhKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtZXJnZSh0YXJnZXQsIHNvdXJjZSkge1xyXG4gICAgICAgIE9iamVjdC5rZXlzKHNvdXJjZSkuZm9yRWFjaChmdW5jdGlvbihwcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICB0YXJnZXRbcHJvcGVydHldID0gc291cmNlW3Byb3BlcnR5XTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBuZW80akRhdGFUb0QzRGF0YShkYXRhKSB7XHJcbiAgICAgICAgdmFyIGdyYXBoID0ge1xyXG4gICAgICAgICAgICBub2RlczogW10sXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IFtdXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZnVuY3Rpb24ocmVzdWx0KSB7XHJcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmZvckVhY2goZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgZGF0YS5ncmFwaC5ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbnRhaW5zKGdyYXBoLm5vZGVzLCBub2RlLmlkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBncmFwaC5ub2Rlcy5wdXNoKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwcy5mb3JFYWNoKGZ1bmN0aW9uKHJlbGF0aW9uc2hpcCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlbGF0aW9uc2hpcC5zb3VyY2UgPSByZWxhdGlvbnNoaXAuc3RhcnROb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlbGF0aW9uc2hpcC50YXJnZXQgPSByZWxhdGlvbnNoaXAuZW5kTm9kZTtcclxuICAgICAgICAgICAgICAgICAgICBncmFwaC5yZWxhdGlvbnNoaXBzLnB1c2gocmVsYXRpb25zaGlwKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwcy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYS5zb3VyY2UgPiBiLnNvdXJjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGEuc291cmNlIDwgYi5zb3VyY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhLnRhcmdldCA+IGIudGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGEudGFyZ2V0IDwgYi50YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaSAhPT0gMCAmJiBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaV0uc291cmNlID09PSBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaS0xXS5zb3VyY2UgJiYgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLnRhcmdldCA9PT0gZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ktMV0udGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpXS5saW5rbnVtID0gZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2kgLSAxXS5saW5rbnVtICsgMTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaV0ubGlua251bSA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGdyYXBoO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJhbmRvbUQzRGF0YShkLCBtYXhOb2Rlc1RvR2VuZXJhdGUpIHtcclxuICAgICAgICB2YXIgZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIG5vZGVzOiBbXSxcclxuICAgICAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IFtdXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGksXHJcbiAgICAgICAgICAgIGxhYmVsLFxyXG4gICAgICAgICAgICBub2RlLFxyXG4gICAgICAgICAgICBudW1Ob2RlcyA9IChtYXhOb2Rlc1RvR2VuZXJhdGUgKiBNYXRoLnJhbmRvbSgpIDw8IDApICsgMSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwLFxyXG4gICAgICAgICAgICBzID0gc2l6ZSgpO1xyXG5cclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtTm9kZXM7IGkrKykge1xyXG4gICAgICAgICAgICBsYWJlbCA9IHJhbmRvbUxhYmVsKCk7XHJcblxyXG4gICAgICAgICAgICBub2RlID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHMubm9kZXMgKyAxICsgaSxcclxuICAgICAgICAgICAgICAgIGxhYmVsczogW2xhYmVsXSxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICByYW5kb206IGxhYmVsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgeDogZC54LFxyXG4gICAgICAgICAgICAgICAgeTogZC55XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBkYXRhLm5vZGVzW2RhdGEubm9kZXMubGVuZ3RoXSA9IG5vZGU7XHJcblxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXAgPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogcy5yZWxhdGlvbnNoaXBzICsgMSArIGksXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBsYWJlbC50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgc3RhcnROb2RlOiBkLmlkLFxyXG4gICAgICAgICAgICAgICAgZW5kTm9kZTogcy5ub2RlcyArIDEgKyBpLFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGZyb206IERhdGUubm93KClcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzb3VyY2U6IGQuaWQsXHJcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHMubm9kZXMgKyAxICsgaSxcclxuICAgICAgICAgICAgICAgIGxpbmtudW06IHMucmVsYXRpb25zaGlwcyArIDEgKyBpXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBkYXRhLnJlbGF0aW9uc2hpcHNbZGF0YS5yZWxhdGlvbnNoaXBzLmxlbmd0aF0gPSByZWxhdGlvbnNoaXA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByYW5kb21MYWJlbCgpIHtcclxuICAgICAgICB2YXIgaWNvbnMgPSBPYmplY3Qua2V5cyhvcHRpb25zLmljb25NYXApO1xyXG4gICAgICAgIHJldHVybiBpY29uc1tpY29ucy5sZW5ndGggKiBNYXRoLnJhbmRvbSgpIDw8IDBdO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJvdGF0ZShjeCwgY3ksIHgsIHksIGFuZ2xlKSB7XHJcbiAgICAgICAgdmFyIHJhZGlhbnMgPSAoTWF0aC5QSSAvIDE4MCkgKiBhbmdsZSxcclxuICAgICAgICAgICAgY29zID0gTWF0aC5jb3MocmFkaWFucyksXHJcbiAgICAgICAgICAgIHNpbiA9IE1hdGguc2luKHJhZGlhbnMpLFxyXG4gICAgICAgICAgICBueCA9IChjb3MgKiAoeCAtIGN4KSkgKyAoc2luICogKHkgLSBjeSkpICsgY3gsXHJcbiAgICAgICAgICAgIG55ID0gKGNvcyAqICh5IC0gY3kpKSAtIChzaW4gKiAoeCAtIGN4KSkgKyBjeTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgeDogbngsIHk6IG55IH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcm90YXRlUG9pbnQoYywgcCwgYW5nbGUpIHtcclxuICAgICAgICByZXR1cm4gcm90YXRlKGMueCwgYy55LCBwLngsIHAueSwgYW5nbGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJvdGF0aW9uKHNvdXJjZSwgdGFyZ2V0KSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguYXRhbjIodGFyZ2V0LnkgLSBzb3VyY2UueSwgdGFyZ2V0LnggLSBzb3VyY2UueCkgKiAxODAgLyBNYXRoLlBJO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNpemUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgbm9kZXM6IG5vZGVzLmxlbmd0aCxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogcmVsYXRpb25zaGlwcy5sZW5ndGhcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4vKlxyXG4gICAgZnVuY3Rpb24gc21vb3RoVHJhbnNmb3JtKGVsZW0sIHRyYW5zbGF0ZSwgc2NhbGUpIHtcclxuICAgICAgICB2YXIgYW5pbWF0aW9uTWlsbGlzZWNvbmRzID0gNTAwMCxcclxuICAgICAgICAgICAgdGltZW91dE1pbGxpc2Vjb25kcyA9IDUwLFxyXG4gICAgICAgICAgICBzdGVwcyA9IHBhcnNlSW50KGFuaW1hdGlvbk1pbGxpc2Vjb25kcyAvIHRpbWVvdXRNaWxsaXNlY29uZHMpO1xyXG5cclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzbW9vdGhUcmFuc2Zvcm1TdGVwKGVsZW0sIHRyYW5zbGF0ZSwgc2NhbGUsIHRpbWVvdXRNaWxsaXNlY29uZHMsIDEsIHN0ZXBzKTtcclxuICAgICAgICB9LCB0aW1lb3V0TWlsbGlzZWNvbmRzKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzbW9vdGhUcmFuc2Zvcm1TdGVwKGVsZW0sIHRyYW5zbGF0ZSwgc2NhbGUsIHRpbWVvdXRNaWxsaXNlY29uZHMsIHN0ZXAsIHN0ZXBzKSB7XHJcbiAgICAgICAgdmFyIHByb2dyZXNzID0gc3RlcCAvIHN0ZXBzO1xyXG5cclxuICAgICAgICBlbGVtLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArICh0cmFuc2xhdGVbMF0gKiBwcm9ncmVzcykgKyAnLCAnICsgKHRyYW5zbGF0ZVsxXSAqIHByb2dyZXNzKSArICcpIHNjYWxlKCcgKyAoc2NhbGUgKiBwcm9ncmVzcykgKyAnKScpO1xyXG5cclxuICAgICAgICBpZiAoc3RlcCA8IHN0ZXBzKSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBzbW9vdGhUcmFuc2Zvcm1TdGVwKGVsZW0sIHRyYW5zbGF0ZSwgc2NhbGUsIHRpbWVvdXRNaWxsaXNlY29uZHMsIHN0ZXAgKyAxLCBzdGVwcyk7XHJcbiAgICAgICAgICAgIH0sIHRpbWVvdXRNaWxsaXNlY29uZHMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuKi9cclxuICAgIGZ1bmN0aW9uIHN0aWNrTm9kZShkKSB7XHJcbiAgICAgICAgZC5meCA9IGQzLmV2ZW50Lng7XHJcbiAgICAgICAgZC5meSA9IGQzLmV2ZW50Lnk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGljaygpIHtcclxuICAgICAgICB0aWNrTm9kZXMoKTtcclxuICAgICAgICB0aWNrUmVsYXRpb25zaGlwcygpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHRpY2tOb2RlcygpIHtcclxuICAgICAgICBpZiAobm9kZSkge1xyXG4gICAgICAgICAgICBub2RlLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyBkLnggKyAnLCAnICsgZC55ICsgJyknO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHMoKSB7XHJcbiAgICAgICAgaWYgKHJlbGF0aW9uc2hpcCkge1xyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGFuZ2xlID0gcm90YXRpb24oZC5zb3VyY2UsIGQudGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyBkLnNvdXJjZS54ICsgJywgJyArIGQuc291cmNlLnkgKyAnKSByb3RhdGUoJyArIGFuZ2xlICsgJyknO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRpY2tSZWxhdGlvbnNoaXBzVGV4dHMoKTtcclxuICAgICAgICAgICAgdGlja1JlbGF0aW9uc2hpcHNPdXRsaW5lcygpO1xyXG4gICAgICAgICAgICB0aWNrUmVsYXRpb25zaGlwc092ZXJsYXlzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHRpY2tSZWxhdGlvbnNoaXBzT3V0bGluZXMoKSB7XHJcbiAgICAgICAgcmVsYXRpb25zaGlwLmVhY2goZnVuY3Rpb24ocmVsYXRpb25zaGlwKSB7XHJcbiAgICAgICAgICAgIHZhciByZWwgPSBkMy5zZWxlY3QodGhpcyksXHJcbiAgICAgICAgICAgICAgICBvdXRsaW5lID0gcmVsLnNlbGVjdCgnLm91dGxpbmUnKSxcclxuICAgICAgICAgICAgICAgIHRleHQgPSByZWwuc2VsZWN0KCcudGV4dCcpLFxyXG4gICAgICAgICAgICAgICAgYmJveCA9IHRleHQubm9kZSgpLmdldEJCb3goKSxcclxuICAgICAgICAgICAgICAgIHBhZGRpbmcgPSAzO1xyXG5cclxuICAgICAgICAgICAgb3V0bGluZS5hdHRyKCdkJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGFuZ2xlID0gcm90YXRpb24oZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0Qm91bmRpbmdCb3ggPSB0ZXh0Lm5vZGUoKS5nZXRCQm94KCksXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dFBhZGRpbmcgPSA1LFxyXG4gICAgICAgICAgICAgICAgICAgIHUgPSB1bml0YXJ5VmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dE1hcmdpbiA9IHsgeDogKGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKHRleHRCb3VuZGluZ0JveC53aWR0aCArIHRleHRQYWRkaW5nKSAqIHUueCkgKiAwLjUsIHk6IChkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtICh0ZXh0Qm91bmRpbmdCb3gud2lkdGggKyB0ZXh0UGFkZGluZykgKiB1LnkpICogMC41IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgbiA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRBMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwICsgKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54IC0gbi54LCB5OiAwICsgKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55IC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRCMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiB0ZXh0TWFyZ2luLnggLSBuLngsIHk6IHRleHRNYXJnaW4ueSAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QzEgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogdGV4dE1hcmdpbi54LCB5OiB0ZXh0TWFyZ2luLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEQxID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IDAgKyAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LngsIHk6IDAgKyAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEEyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gdGV4dE1hcmdpbi54IC0gbi54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIHRleHRNYXJnaW4ueSAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QjIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggLSBuLnggLSB1LnggKiBvcHRpb25zLmFycm93U2l6ZSwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgLSBuLnkgLSB1LnkgKiBvcHRpb25zLmFycm93U2l6ZSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QzIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggLSBuLnggKyAobi54IC0gdS54KSAqIG9wdGlvbnMuYXJyb3dTaXplLCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIG4ueSArIChuLnkgLSB1LnkpICogb3B0aW9ucy5hcnJvd1NpemUgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEQyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50RTIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggKyAoLSBuLnggLSB1LngpICogb3B0aW9ucy5hcnJvd1NpemUsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55ICsgKC0gbi55IC0gdS55KSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRGMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCAtIHUueCAqIG9wdGlvbnMuYXJyb3dTaXplLCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIHUueSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRHMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIHRleHRNYXJnaW4ueCwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSB0ZXh0TWFyZ2luLnkgfSwgYW5nbGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiAnTSAnICsgcm90YXRlZFBvaW50QTEueCArICcgJyArIHJvdGF0ZWRQb2ludEExLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50QjEueCArICcgJyArIHJvdGF0ZWRQb2ludEIxLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50QzEueCArICcgJyArIHJvdGF0ZWRQb2ludEMxLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50RDEueCArICcgJyArIHJvdGF0ZWRQb2ludEQxLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICcgWiBNICcgKyByb3RhdGVkUG9pbnRBMi54ICsgJyAnICsgcm90YXRlZFBvaW50QTIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRCMi54ICsgJyAnICsgcm90YXRlZFBvaW50QjIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRDMi54ICsgJyAnICsgcm90YXRlZFBvaW50QzIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnREMi54ICsgJyAnICsgcm90YXRlZFBvaW50RDIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRFMi54ICsgJyAnICsgcm90YXRlZFBvaW50RTIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRGMi54ICsgJyAnICsgcm90YXRlZFBvaW50RjIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRHMi54ICsgJyAnICsgcm90YXRlZFBvaW50RzIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgJyBaJztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHNPdmVybGF5cygpIHtcclxuICAgICAgICByZWxhdGlvbnNoaXBPdmVybGF5LmF0dHIoJ2QnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgIHZhciBjZW50ZXIgPSB7IHg6IDAsIHk6IDAgfSxcclxuICAgICAgICAgICAgICAgIGFuZ2xlID0gcm90YXRpb24oZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgIG4xID0gdW5pdGFyeU5vcm1hbFZlY3RvcihkLnNvdXJjZSwgZC50YXJnZXQpLFxyXG4gICAgICAgICAgICAgICAgbiA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0LCA1MCksXHJcbiAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRBID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IDAgLSBuLngsIHk6IDAgLSBuLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIG4ueCwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSBuLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QyA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCArIG4ueCAtIG4xLngsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55ICsgbi55IC0gbjEueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnREID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IDAgKyBuLnggLSBuMS54LCB5OiAwICsgbi55IC0gbjEueSB9LCBhbmdsZSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJ00gJyArIHJvdGF0ZWRQb2ludEEueCArICcgJyArIHJvdGF0ZWRQb2ludEEueSArXHJcbiAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEIueCArICcgJyArIHJvdGF0ZWRQb2ludEIueSArXHJcbiAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEMueCArICcgJyArIHJvdGF0ZWRQb2ludEMueSArXHJcbiAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEQueCArICcgJyArIHJvdGF0ZWRQb2ludEQueSArXHJcbiAgICAgICAgICAgICAgICAgICAnIFonO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHRpY2tSZWxhdGlvbnNoaXBzVGV4dHMoKSB7XHJcbiAgICAgICAgcmVsYXRpb25zaGlwVGV4dC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgIHZhciBhbmdsZSA9IChyb3RhdGlvbihkLnNvdXJjZSwgZC50YXJnZXQpICsgMzYwKSAlIDM2MCxcclxuICAgICAgICAgICAgICAgIG1pcnJvciA9IGFuZ2xlID4gOTAgJiYgYW5nbGUgPCAyNzAsXHJcbiAgICAgICAgICAgICAgICBjZW50ZXIgPSB7IHg6IDAsIHk6IDAgfSxcclxuICAgICAgICAgICAgICAgIG4gPSB1bml0YXJ5Tm9ybWFsVmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICBuV2VpZ2h0ID0gbWlycm9yID8gMiA6IC0zLFxyXG4gICAgICAgICAgICAgICAgcG9pbnQgPSB7IHg6IChkLnRhcmdldC54IC0gZC5zb3VyY2UueCkgKiAwLjUgKyBuLnggKiBuV2VpZ2h0LCB5OiAoZC50YXJnZXQueSAtIGQuc291cmNlLnkpICogMC41ICsgbi55ICogbldlaWdodCB9LFxyXG4gICAgICAgICAgICAgICAgcm90YXRlZFBvaW50ID0gcm90YXRlUG9pbnQoY2VudGVyLCBwb2ludCwgYW5nbGUpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIHJvdGF0ZWRQb2ludC54ICsgJywgJyArIHJvdGF0ZWRQb2ludC55ICsgJykgcm90YXRlKCcgKyAobWlycm9yID8gMTgwIDogMCkgKyAnKSc7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdG9TdHJpbmcoZCkge1xyXG4gICAgICAgIHZhciBzID0gZC5sYWJlbHMgPyBkLmxhYmVsc1swXSA6IGQudHlwZTtcclxuXHJcbiAgICAgICAgcyArPSAnICg8aWQ+OiAnICsgZC5pZDtcclxuXHJcbiAgICAgICAgT2JqZWN0LmtleXMoZC5wcm9wZXJ0aWVzKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgIHMgKz0gJywgJyArIHByb3BlcnR5ICsgJzogJyArIEpTT04uc3RyaW5naWZ5KGQucHJvcGVydGllc1twcm9wZXJ0eV0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzICs9ICcpJztcclxuXHJcbiAgICAgICAgcmV0dXJuIHM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdW5pdGFyeU5vcm1hbFZlY3Rvcihzb3VyY2UsIHRhcmdldCwgbmV3TGVuZ3RoKSB7XHJcbiAgICAgICAgdmFyIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgICAgICB2ZWN0b3IgPSB1bml0YXJ5VmVjdG9yKHNvdXJjZSwgdGFyZ2V0LCBuZXdMZW5ndGgpO1xyXG5cclxuICAgICAgICByZXR1cm4gcm90YXRlUG9pbnQoY2VudGVyLCB2ZWN0b3IsIDkwKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1bml0YXJ5VmVjdG9yKHNvdXJjZSwgdGFyZ2V0LCBuZXdMZW5ndGgpIHtcclxuICAgICAgICB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KE1hdGgucG93KHRhcmdldC54IC0gc291cmNlLngsIDIpICsgTWF0aC5wb3codGFyZ2V0LnkgLSBzb3VyY2UueSwgMikpIC8gTWF0aC5zcXJ0KG5ld0xlbmd0aCB8fCAxKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogKHRhcmdldC54IC0gc291cmNlLngpIC8gbGVuZ3RoLFxyXG4gICAgICAgICAgICB5OiAodGFyZ2V0LnkgLSBzb3VyY2UueSkgLyBsZW5ndGgsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVXaXRoRDNEYXRhKGQzRGF0YSkge1xyXG4gICAgICAgIHVwZGF0ZU5vZGVzQW5kUmVsYXRpb25zaGlwcyhkM0RhdGEubm9kZXMsIGQzRGF0YS5yZWxhdGlvbnNoaXBzKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVXaXRoTmVvNGpEYXRhKG5lbzRqRGF0YSkge1xyXG4gICAgICAgIHZhciBkM0RhdGEgPSBuZW80akRhdGFUb0QzRGF0YShuZW80akRhdGEpO1xyXG4gICAgICAgIHVwZGF0ZVdpdGhEM0RhdGEoZDNEYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVJbmZvKGQpIHtcclxuICAgICAgICBjbGVhckluZm8oKTtcclxuXHJcbiAgICAgICAgaWYgKGQubGFiZWxzKSB7XHJcbiAgICAgICAgICAgIGFwcGVuZEluZm9FbGVtZW50Q2xhc3MoJ2NsYXNzJywgZC5sYWJlbHNbMF0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGFwcGVuZEluZm9FbGVtZW50UmVsYXRpb25zaGlwKCdjbGFzcycsIGQudHlwZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcHBlbmRJbmZvRWxlbWVudFByb3BlcnR5KCdwcm9wZXJ0eScsICcmbHQ7aWQmZ3Q7JywgZC5pZCk7XHJcblxyXG4gICAgICAgIE9iamVjdC5rZXlzKGQucHJvcGVydGllcykuZm9yRWFjaChmdW5jdGlvbihwcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICBhcHBlbmRJbmZvRWxlbWVudFByb3BlcnR5KCdwcm9wZXJ0eScsIHByb3BlcnR5LCBKU09OLnN0cmluZ2lmeShkLnByb3BlcnRpZXNbcHJvcGVydHldKSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlTm9kZXMobikge1xyXG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KG5vZGVzLCBuKTtcclxuXHJcbiAgICAgICAgbm9kZSA9IHN2Z05vZGVzLnNlbGVjdEFsbCgnLm5vZGUnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgIC5kYXRhKG5vZGVzLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmlkOyB9KTtcclxuICAgICAgICB2YXIgbm9kZUVudGVyID0gYXBwZW5kTm9kZVRvR3JhcGgoKTtcclxuICAgICAgICBub2RlID0gbm9kZUVudGVyLm1lcmdlKG5vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZU5vZGVzQW5kUmVsYXRpb25zaGlwcyhuLCByKSB7XHJcbiAgICAgICAgdXBkYXRlUmVsYXRpb25zaGlwcyhyKTtcclxuICAgICAgICB1cGRhdGVOb2RlcyhuKTtcclxuXHJcbiAgICAgICAgc2ltdWxhdGlvbi5ub2Rlcyhub2Rlcyk7XHJcbiAgICAgICAgc2ltdWxhdGlvbi5mb3JjZSgnbGluaycpLmxpbmtzKHJlbGF0aW9uc2hpcHMpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVJlbGF0aW9uc2hpcHMocikge1xyXG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KHJlbGF0aW9uc2hpcHMsIHIpO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXAgPSBzdmdSZWxhdGlvbnNoaXBzLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5kYXRhKHJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuaWQ7IH0pO1xyXG5cclxuICAgICAgICB2YXIgcmVsYXRpb25zaGlwRW50ZXIgPSBhcHBlbmRSZWxhdGlvbnNoaXBUb0dyYXBoKCk7XHJcblxyXG4gICAgICAgIHJlbGF0aW9uc2hpcCA9IHJlbGF0aW9uc2hpcEVudGVyLnJlbGF0aW9uc2hpcC5tZXJnZShyZWxhdGlvbnNoaXApO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXBPdXRsaW5lID0gc3ZnLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCAub3V0bGluZScpO1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcE91dGxpbmUgPSByZWxhdGlvbnNoaXBFbnRlci5vdXRsaW5lLm1lcmdlKHJlbGF0aW9uc2hpcE91dGxpbmUpO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXBPdmVybGF5ID0gc3ZnLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCAub3ZlcmxheScpO1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcE92ZXJsYXkgPSByZWxhdGlvbnNoaXBFbnRlci5vdmVybGF5Lm1lcmdlKHJlbGF0aW9uc2hpcE92ZXJsYXkpO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXBUZXh0ID0gc3ZnLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCAudGV4dCcpO1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcFRleHQgPSByZWxhdGlvbnNoaXBFbnRlci50ZXh0Lm1lcmdlKHJlbGF0aW9uc2hpcFRleHQpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHZlcnNpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gem9vbUZpdCh0cmFuc2l0aW9uRHVyYXRpb24pIHtcclxuICAgICAgICB2YXIgYm91bmRzID0gc3ZnLm5vZGUoKS5nZXRCQm94KCksXHJcbiAgICAgICAgICAgIHBhcmVudCA9IHN2Zy5ub2RlKCkucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LFxyXG4gICAgICAgICAgICBmdWxsV2lkdGggPSBwYXJlbnQuY2xpZW50V2lkdGgsXHJcbiAgICAgICAgICAgIGZ1bGxIZWlnaHQgPSBwYXJlbnQuY2xpZW50SGVpZ2h0LFxyXG4gICAgICAgICAgICB3aWR0aCA9IGJvdW5kcy53aWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0ID0gYm91bmRzLmhlaWdodCxcclxuICAgICAgICAgICAgbWlkWCA9IGJvdW5kcy54ICsgd2lkdGggLyAyLFxyXG4gICAgICAgICAgICBtaWRZID0gYm91bmRzLnkgKyBoZWlnaHQgLyAyO1xyXG5cclxuICAgICAgICBpZiAod2lkdGggPT09IDAgfHwgaGVpZ2h0ID09PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybjsgLy8gbm90aGluZyB0byBmaXRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN2Z1NjYWxlID0gMC44NSAvIE1hdGgubWF4KHdpZHRoIC8gZnVsbFdpZHRoLCBoZWlnaHQgLyBmdWxsSGVpZ2h0KTtcclxuICAgICAgICBzdmdUcmFuc2xhdGUgPSBbZnVsbFdpZHRoIC8gMiAtIHN2Z1NjYWxlICogbWlkWCwgZnVsbEhlaWdodCAvIDIgLSBzdmdTY2FsZSAqIG1pZFldO1xyXG5cclxuICAgICAgICBzdmcuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgc3ZnVHJhbnNsYXRlWzBdICsgJywgJyArIHN2Z1RyYW5zbGF0ZVsxXSArICcpIHNjYWxlKCcgKyBzdmdTY2FsZSArICcpJyk7XHJcbi8vICAgICAgICBzbW9vdGhUcmFuc2Zvcm0oc3ZnVHJhbnNsYXRlLCBzdmdTY2FsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdChfc2VsZWN0b3IsIF9vcHRpb25zKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGFwcGVuZFJhbmRvbURhdGFUb05vZGU6IGFwcGVuZFJhbmRvbURhdGFUb05vZGUsXHJcbiAgICAgICAgbmVvNGpEYXRhVG9EM0RhdGE6IG5lbzRqRGF0YVRvRDNEYXRhLFxyXG4gICAgICAgIHJhbmRvbUQzRGF0YTogcmFuZG9tRDNEYXRhLFxyXG4gICAgICAgIHNpemU6IHNpemUsXHJcbiAgICAgICAgdXBkYXRlV2l0aEQzRGF0YTogdXBkYXRlV2l0aEQzRGF0YSxcclxuICAgICAgICB1cGRhdGVXaXRoTmVvNGpEYXRhOiB1cGRhdGVXaXRoTmVvNGpEYXRhLFxyXG4gICAgICAgIHZlcnNpb246IHZlcnNpb25cclxuICAgIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTmVvNGpEMztcclxuIl19
