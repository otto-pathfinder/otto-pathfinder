var param = {},
	socket = null,
	port = null,
	url = null,
	redodata = {},
	csvdata = {nodes:[], links: []},
	math = {
		anteil: function (basis, anteil) {
			if (basis !== 0) {
				return 100 / basis * anteil;
			} else {
				return NaN;
			}
		}
	},
	$ = function (s) { return document.querySelectorAll(s); },
	zf = function (n) {
		n = '00' + n;
		return n.slice(-2);
	},
	layer = function (title, content) {
		var fog = d3.select(document.body).append('div'),
			frame = fog.append('div'),
			close = frame.append('div');
		
		fog			.classed('layer', true);
		
		close		.classed('material-icons', true)
					.classed('close', true)
					.text('close');
		
		close.on('click', function () {
			fog		.transition()
					.style('opacity', 0)
					.each('end', function () {
						this.remove();
					});
		});
		
		if (title !== undefined) {
			frame	.append('h1')
					.classed('headline', true)
					.text(title);
		}
		if (content !== undefined) {
			frame	.node()
					.appendChild(content.node());
		}
		
		fog			.style('opacity', 0)
					.transition()
					.style('opacity', 1);
	},
	guid = function () {
		function s4() {
			return Math	.floor((1 + Math.random()) * 0x10000)
						.toString(16)
						.substring(1);
		}
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
	},
	load = function () {
		var frame = d3.select(document.createElement('div')),
			content = frame.append('form');
		
		content.classed('layer-content', true);
		
		content	.append('label')
				.text('Speicherstand');
		var inp = content	.append('select');
		inp					.selectAll('option')
							.data(
								d3	.entries(localStorage)
									.filter(function (d) {
										return d.key.substring(0, 4) === 'mem_';
									})
							)
							.enter()
							.append('option')							
							.text(function (d, i) {
								return d.key.substring(4);
							})
							.attr('value', function (d, i) {
								return d.value;
							})
							.classed('fwidth', true);
		content	.append('button')
				.style('width', 'calc(100% - 155px)')
				.style('margin-right', '5px')
				.text('Sankey laden');
				
		var btn = content	.append('button')
							.classed('is-delete', true)
							.attr('type', 'button')
							.on('click', function () {
								var si = inp.node().selectedIndex;
								inp	.selectAll('option')
									.filter(function (d, i) {
										if (i === si) {
											localStorage.removeItem('mem_' + this.innerText);
											return true;
										}
										return false;
									})
									.remove();
							})
							.style('width', '150px')
							.text('Sankey löschen');
		
		content	.style('width', '600px')
				.style('height', 'auto');
				
		content	.on('submit', function () {
			var ev = d3.event;
			ev.preventDefault();
			if (inp.node.value !== '') {
				var v = JSON.parse(inp.node().value);
				localStorage.node_settings = v.node_settings;
				localStorage.settings = v.settings;
				d3.select('#settings').classed('is-invisible', true);
				$('.close')[0].click();				
						
				var lc = JSON.parse(localStorage.settings);
			
				$('#base')[0].value = lc.base;
				socket.emit('load_base_param', {base: lc.base});
				if (localStorage && localStorage.node_settings) {
					socket.emit('set_config', JSON.parse(localStorage.node_settings));
				}
				
				var loadSankey = function () {
					if (d3.select('#settings.is-invisible').empty()) {
						oeach(lc, function (d) {
							var tmp = d3.select('[name=' + d.key + ']');
							if (d.key.substring(0, 17) === 'filter_multilist_') {
								oeach(d.value, function (dd) {
									tmp.select('[value="' + dd.value + '"]').attr('selected', 'selected');
								});
							} else {
								if (!tmp.empty()) {
									tmp.node().value = d.value;
								}
							}
						});
						document.querySelector('#btn').click();
					} else {
						window.setTimeout(loadSankey, 100);
					}
				}
				loadSankey();
			}
		});
		
		layer('Sankey laden', frame);
	},
	save = function () {
		var frame = d3.select(document.createElement('div')),
			content = frame.append('form');
		
		content.classed('layer-content', true);
		
		content	.append('datalist')
				.attr('id', 'save_list')
				.selectAll('option')
				.data(
					d3	.entries(localStorage)
						.filter(function (d) {
							return d.key.substring(0, 4) === 'mem_';
						})
				)
				.enter()
				.append('option')							
				.text(function (d, i) {
					return d.key.substring(4);
				})
				.attr('value', function (d, i) {
					return d.key.substring(4);
				});
		
		content	.append('label')
				.text('Titel');
		var inp = content	.append('input')
							.attr('required', 'required')
							.attr('list', 'save_list')
							.classed('fwidth', true);
		content	.append('button')
				.text('Im Browser speichern');
		
		content	.style('width', '600px')
				.style('height', 'auto');
				
		content	.on('submit', function () {
			var ev = d3.event;
			ev.preventDefault();
			
			var values = {
				node_settings: localStorage.node_settings,
				settings: localStorage.settings
			};
			localStorage['mem_' + inp.node().value] = JSON.stringify(values);
			
			content	.selectAll('*')
					.remove();
					
			content	.append('div')
					.style('text-align', 'center')
					.text('Sankey wurde erfolgreich gespeichert.');
					
		});
		
		layer('Sankey speichern', frame);
	},
	csv = function () {
		var list = [],
			content = "data:text/csv;charset=utf-8,Quelle Schritt;Quelle Name;Vorkommen;Ziel Schritt;Ziel Name\n",
			link = document.createElement('a');
		if (!$('#base')[0].value || csvdata.links.length === 0) {
			return;
		}
		oeach(csvdata.links, function (d, i) {
			list.push([
				d.value.source.data.pos,
				d.value.source.data.label,
				d.value.value,
				d.value.target.data.pos,
				d.value.target.data.label
			].join(';'));
		});
		content += list.join("\n");
		content = encodeURI(content);
		link.setAttribute('href', content);
		link.setAttribute('download', $('#base')[0].value + '.csv');
		link.click();
	},
	holes_remove = function () {
		d3	.selectAll('.hole')
			.transition()
			.style('opacity', 0)
			.each('end', function () {
				this.remove();
			});			
	},
	hole = function (x, y, w, h) {
		var d = document.createElement('div');
		d.classList.add('hole');
		d.style.top = y + 'px';
		d.style.left = x + 'px';
		d.style.width = w + 'px';
		d.style.height = h + 'px';
		document.body.appendChild(d);
		d3	.select(d)
			.style('opacity', 0)
			.transition()
			.style('opacity', 1);
		return d;
	},
	help_text = [
		'Bitte wählen Sie zunächst eine Datenquelle aus.<br /><br />Informationen zu den Datenquellen finden Sie unter "<span onclick="sourcesinfo();" style="cursor:pointer;">Datenquelleninformationen</span>".',
		'Hier können Sie zu kleine und zu große Knoten rausfiltern. Dies ist dann relevant, wenn Sie nur Knoten mit einem bestimmten Vorkommen sehen möchten. <br /><br />Die Empfehlung ist jedoch, die Sankey zunächst komplett generieren zu lassen, um eine Vorstellung der Knotengrößen zu erhalten.<br /><br />Achten Sie auch darauf, dass beim Drillen und Filtern die Knoten möglicherweise kleiner und durch diese Einstellung nicht mehr angezeigt werden.',
		'Ein Pfad über den gesamten Weg zu beobachten ist nicht immer Sinnvoll. Daher haben Sie hier die Möglichkeit, die Pfadlänge zu reduzieren.<br /><br />Bei der Datengenerierung wird für die Analyse bereits eine ideale Pfadlänge als Vorschlag ermittelt und hier voreingestellt.',
		'Möchten Sie nur einen bestimmten Zeitraum betrachten, können Sie dies hier einstellen.<br /><br />Bei der Datengenerierung wird für die Analyse bereits ein Zeitraum als Vorschlag ermittelt und hier voreingestellt.',
		'Bei einigen Pfadanalysen ist es möglich, andere Werte als die Anzahl der Pfade selbst zu wählen. Zum Beispiel kann auch eine Kostenbetrachtung in Frage kommen, da verschiedene Knotenpunkte eine unterschiedliche Wertigkeit haben.<br /><br />Die möglichen Kumulationsoptionen können Sie hier ändern.',
		'Sie haben bei dieser Pfadanalyse die Möglichkeit, die Daten mit zusätzlichen Filtern einzuschränken. Wenn Sie einen Filter einstellen, werden die Daten auf das Vorkommen dieses Wertes geprüft.<br /><br />Pfade die dem Filter nicht entsprechen werden vollständig ignoriert.',
		'Sie haben die Möglichkeit bei einem Knoten in eine tiefere Ebene zu drillen, oder mit "Wichtiger Knoten" nur noch Pfade anzuzeigen, die auch durch diesen Knoten laufen.<br /><br />Mit "Unwichtiger Knoten" können Sie den Knoten und alle Pfade die durch diesen Laufen ausblenden.<br /><br />Probieren Sie es selbst aus. Machen Sie dazu einen Rechtsklick auf den gewünschten Knoten, um das Auswahlmenü zu erhalten.',
		'Hier sehen Sie alle Knoten, die in eine tiefere Detailstufe gedrillt wurden. Wenn Sie den Drilldown rückgängig machen möchten, klicken Sie einfach auf den entsprechenden Knoten in dieser Liste.<br /><br />Alternativ können Sie auch in der Grafik einen Rechtsklick auf den entsprechenden Knoten machen und "Drillup" wählen.',
		'In dieser Liste sehen Sie alle Knoten, die als Voraussetzung zur Anzeige der Pfade gesetzt wurden. Somit sehen Sie in der Grafik nur noch Pfade, die diese Knoten passiert haben.<br /><br />Wenn Sie diese Einstellung rückgängig machen möchten, klicken Sie einfach auf den entsprechenden Knoten in dieser Liste.',
		'Hier werden die Knoten aufgeführt, die für Ihre Betrachtung uninteressant sind. Damit sehen Sie in der Grafik nur noch Pfade, die nicht durch diesen Knoten gelaufen sind.<br /><br />Wenn Sie diese Einstellung rückgängig machen möchten, klicken Sie einfach auf den entsprechenden Knoten in dieser Liste.'
	],
	helptype_ok = [],
	help = function (helptype, auto, pos, modal) {
		holes_remove();
		if (document.querySelector('.inithelp')) {
			close_all_bubble('.inithelp');
		}
		if (helptype === 0 || ((auto === undefined || auto === true) && helptype_ok[helptype - 1])) {
			return;
		}
		helptype_ok[helptype - 1] = true;
		var txt = '',
			c = [0, 0],
			w = 'is-left-top';
		
		switch (helptype) {
		case 1:
			txt = help_text[helptype - 1];
			c = [295, 78];
			//hole(5,100,290,80);
			break;
		case 2:
			txt = help_text[helptype - 1];
			c = [295, 153];
			//hole(5,170,290,80);
			break;
		case 3:
			txt = help_text[helptype - 1];
			c = [295, 224];
			//hole(5,240,290,80);
			break;
		case 4:
			txt = help_text[helptype - 1];
			c = [295, 297];
			//hole(5,315,290,120);
			break;
		case 5:
			txt = help_text[helptype - 1];
			c = [295, 413];
			//hole(5,430,290,80);
			break;
		case 6:
			txt = help_text[helptype - 1];
			c = [295, 487];
			//hole(5,505,290,80);
			break;
		case 7:
			txt = help_text[helptype - 1];
			c = [278, 90];
			w = 'is-bottom-left';
			//hole(290,90,45,+window.innerHeight - 130);
			break;
		case 8:
		case 9:
		case 10:
			txt = help_text[helptype - 1];
			c = pos || c;
			w = 'is-bottom-left';
			break;
		}
		var b = bubble(txt, c[0], c[1], w, function () { holes_remove(); }, modal);
			b.classList.add('inithelp');
			d3	.select('.main-content')
				.node()
				.appendChild(b);
			d3	.select(b)
				.style('opacity', 0)
				.transition()
				.style('opacity', 1);
	},
	bubble = function (txt, x, y, pos, callback, modal) {
		var d = document.createElement('div'),
			c = document.createElement('div');
		pos = pos || 'is-left-top';
		x = x || 0;
		y = y || 0;
		txt = txt || '???';
		
		d.classList.add('bubble');
		d.classList.add(pos);
		d.style.left = x + 'px';
		d.style.top = y + 'px';
		d.innerHTML = txt;
		
		if (modal !== true) {
			c.classList.add('close');
			c.appendChild(document.createTextNode('close'));
			c.onclick = function () { close_bubble(d); if (callback) { callback(); } };
			d.appendChild(c);
		}
		
		return d;
	},
	close_bubble = function (o) {
		d3		.select(o)
				.transition()
				.style('opacity', 0)
				.each('end', function () {
					this.remove();
				});
	},
	close_all_bubble = function (o) {
		d3		.selectAll(o)
				.transition()
				.style('opacity', 0)
				.each('end', function () {
					this.remove();
				});
	},
	search = function (self) {
		var target = d3.select(self.parentNode).selectAll('.box'),
			txt = self.value;
		
		if (txt === '') {
			target.classed('is-invisible', false);
		} else {
			target	.each(function (d, i) {
				var s = this.querySelector('h1').innerText;
				d3.select(this).classed('is-invisible', (s.toLowerCase().indexOf(txt.toLowerCase()) === -1));
			});
		}
	},
	help_database = function (self) {
		var g = guid();
		if (self.parentNode.classList.contains('is-dropdown')) {
			self.parentNode.classList.remove('is-dropdown');
			self.parentNode.classList.add('is-dropup');
			
			if (self.nextSibling.classList.length === 0) {
				d3.select(self.nextSibling).append('div').style('text-align', 'center').text('Suche Metadaten zur Datenquelle ' + self.innerText).append('span').text('.').classed('loading', true);
				spinner(d3.select(self.nextSibling));
				self.nextSibling.classList.add('help_db-' + g);
				
				socket.emit('help_content', {
					content: self.innerText,
					target: '.help_db-' + g
				});
			}
		} else {
			self.parentNode.classList.add('is-dropdown');
			self.parentNode.classList.remove('is-dropup');
		}
	},
	sourcesinfo = function () {
		var frame = d3.select(document.createElement('div')),
			content = frame.append('div');
		
		frame.style('display', 'flex');
		content.classed('layer-content', true);
		
		layer('Datenquelleninformationen', frame);
		autoEvents();
		
		socket.emit('help', {
			content: 'Datenquellen'
		});
	},
	autoEvents = function () {
		var i = 0,
			imax = 0,
			elements = null,
			temp = null,
			cur = null;
		// Radio Buttons
		elements = document.querySelectorAll('.is-radio:not(.auto-events)');
		
		for (i = 0, imax = elements.length; i < imax; i += 1) {
			cur = elements[i];
			cur.classList.add('auto-events');
			
			d3.select(cur).on('mousedown', function () {
				var p = d3.select(this.parentNode),
					c = p.selectAll('[name=' + this.getAttribute('name') + ']');
				c.classed('is-active', false);
				
				this.classList.add('is-active');
			});
		}		
	},
	change = function (data) {
		event = window.event || event;
		event.preventDefault();
		
		d3		.select('#context')
				.remove();
		
		var elements =	{
							vorkommen_min:	$('#VorkommenMin')[0],
							vorkommen_max:	$('#VorkommenMax')[0],
							schritt_min:	$('#SchritteMin')[0],
							schritt_max:	$('#SchritteMax')[0],
							zeitraum_min:	$('#ZeitraumMin')[0],
							zeitraum_max:	$('#ZeitraumMax')[0],
							btn:			$('#btn')[0]
						};
		var dis = false;
		oeach(elements, function (d) {
			if (d.value.disabled === true) {
				dis = true;
			}
		});
		
		if (dis) { return; }
			
		var c = d3	.select('.main-content')
					.append('div')
					.classed('frame', true)
					.append('div');
		c		.text('Sankeydaten werden geladen')
				.append('span')
				.classed('loading', true)
				.text('.');
		c = c	.append('div')
				.classed('status', true);
		c		.append('div')
				.classed('status_text', true);
		spinner(c);
		
		data.vorkommen_min =	+elements.vorkommen_min.value;
		data.vorkommen_max =	+elements.vorkommen_max.value;
		data.schritt_min =		+elements.schritt_min.value;
		data.schritt_max =		+elements.schritt_max.value;
		data.zeitraum_min =		elements.zeitraum_min.value;
		data.zeitraum_max =		elements.zeitraum_max.value;
		
		socket.emit('change', data);
	},
	d3sankey = function (target, data, attr) {
		attr = attr || {};
		var format 			= 	function(d, dec) {
									return 	(+d3.format("." + (dec || 0) + "f")(d))
											.toLocaleString();
								},
			color 			= d3.scale.category20(),
			width 			= attr.width	|| +target.offsetWidth - 20,
			height 			= attr.height 	|| +target.offsetHeight - 80,
			margin 			= attr.margin 	|| {left: 0,right: 10,top:10,bottom:20},
			ocevent 		= attr.onclick 	|| function (d, i) {},
			sankey 			= null,
			svg 			= null,
			path 			= null,
			link0 			= null,
			link1 			= null,
			link2 			= null,
			node 			= null,
			vmin			= +$('#VorkommenMin')[0].value,
			vmax			= +$('#VorkommenMax')[0].value;
			
		function dragmove(d) {
			d3			.select(this)
						.attr('transform', 'translate(' + (d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))) + ',' + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ')');
			sankey		.relayout();
			link0		.attr('d', path(0));
			link1		.attr('d', path(1));
			link2		.attr('d', path(2));
	  	}
		if (data === undefined) {
			console.error('data undefined, %O %O %O', target, data, attr);
			return;
		}
		
		csvdata.nodes = data.nodes;
		csvdata.links = data.links;
		
		sankey = d3		.sankey()
						.size([width, height])
						.nodeWidth(15)
						.nodePadding(10)
						.nodes(data.nodes)
						.links(data.links)
						.layout(32);

		svg = d3		.select(target)
						.selectAll('svg.sankey')
						.remove();
		
		svg = d3		.select(target)
						.append('svg')
						.attr('class', 'sankey')
						.attr('width', width + margin.left + margin.right)
						.attr('height', height + margin.top + margin.bottom + 50)
						.append('g')
						.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		path = sankey	.reversibleLink();

		g = svg			.append('g')
						.selectAll('.sankey_link')
						.data(data.links.filter(function (d) {
							return (d.source.value >= vmin && d.source.value <= vmax && d.target.value >= vmin && d.target.value <= vmax);
						}))
						.enter()
						.append('g')
						.attr('class', 'sankey_link')
						.sort(function(a, b) { return b.dy - a.dy; });
		
		link0 = g		.append('path')
						.attr('d', path(0));
		link1 = g		.append('path')
						.attr('d', path(1));
		link2 = g		.append('path')
						.attr('d', path(2));
		
		g				.on('mousemove', function (d) {
							var ev = d3.event;
							if (this.bubble === undefined) {
								close_all_bubble('.bubble');
								this.bubble = bubble(
									'<h1>' + d.source.pos + ' ' + d.source.data.label + ' <span class="material-icons" style="margin-top:-2px;">link</span> ' + d.target.pos + ' ' + d.target.data.label + '</h1>' +
									'Vorkommen: ' + format(d.value),
									0,
									0,
									'is-left-top',
									undefined,
									true
								);
								d3	.select('.main-content')
									.node()
									.appendChild(this.bubble);
								d3	.select(this.bubble)
									.style('opacity', 0)
									.transition()
									.style('opacity', 1);
									
								this.bubble.classList.add('is-moveable');
							}
							this.bubble.classList.remove('is-left-top');
							this.bubble.classList.remove('is-right-top');
							this.bubble.classList.remove('is-left-bottom');
							this.bubble.classList.remove('is-right-bottom');
							this.bubble.classList.remove('is-bottom-right');
							var cls = 'is-';
							if (ev.clientX + 35 + this.bubble.getBoundingClientRect().width > window.innerWidth) {
								this.bubble.style.left = (ev.clientX - 35 - this.bubble.getBoundingClientRect().width) + 'px';
								cls += 'right-';
							} else {
								this.bubble.style.left = (ev.clientX + 35) + 'px';
								cls += 'left-';
							}
							if (ev.clientY + 34 + this.bubble.getBoundingClientRect().height > window.innerHeight) {
								this.bubble.style.top = (ev.clientY + 34 - this.bubble.getBoundingClientRect().height) + 'px';
								cls += 'bottom';
								if (this.bubble.getBoundingClientRect().top + this.bubble.getBoundingClientRect().height > window.innerHeight) {
									cls = 'is-bottom-right';
									this.bubble.style.left = ev.clientX + 35 - this.bubble.getBoundingClientRect().width + 'px';
									this.bubble.style.top = ev.clientY - 24 - this.bubble.getBoundingClientRect().height + 'px';
								}
							} else {
								this.bubble.style.top = (ev.clientY - 34) + 'px';
								cls += 'top';
							}
							this.bubble.classList.add(cls);
						})
						.on('mouseout', function () {
							close_all_bubble('.bubble');
							delete this.bubble;
						});
		
		node = svg		.append('g')
						.selectAll('.sankey_node')
						.data(data.nodes.filter(function (d) { return (d.value >= vmin && d.value <= vmax); }))
						.enter()
						.append('g')
						.attr('class', 'sankey_node')
						.attr('style', 'cursor:move;')
						.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; })
						.on('contextmenu', ocevent)
						.on('mousemove', function (d) {
							var ev = d3.event;

							if (this.bubble === undefined) {
								close_all_bubble('.bubble');
								this.bubble = bubble(
									'<h1><span class="material-icons" style="margin-top:-2px;">room</span> ' + d.pos + ' ' + d.data.label + '</h1>' +
									'Vorkommen: ' + format(d.value) + '<br />' +
									'Anteil: ' + format(math.anteil(d3.sum(data.nodes, function (dd) { if (dd.pos === d.pos) { return dd.value; }; }), d.value), 2) + '%' + '<br /><br />' +
									'<span style="font-size:0.7em"><span class="material-icons" style="font-size:18px; margin-right:5px;">help_outline</span>Rechtsklick auf diesen Knoten für weitere Optionen.</span>',
									0,
									0,
									'is-left-top',
									undefined,
									true
								);
								d3	.select('.main-content')
									.node()
									.appendChild(this.bubble);
								d3	.select(this.bubble)
									.style('opacity', 0)
									.transition()
									.style('opacity', 1);
									
								this.bubble.classList.add('is-moveable');
							}
							this.bubble.classList.remove('is-left-top');
							this.bubble.classList.remove('is-right-top');
							this.bubble.classList.remove('is-left-bottom');
							this.bubble.classList.remove('is-right-bottom');
							this.bubble.classList.remove('is-bottom-right');
							var cls = 'is-';
							if (ev.clientX + 35 + this.bubble.getBoundingClientRect().width > window.innerWidth) {
								this.bubble.style.left = (ev.clientX - 35 - this.bubble.getBoundingClientRect().width) + 'px';
								cls += 'right-';
							} else {
								this.bubble.style.left = (ev.clientX + 35) + 'px';
								cls += 'left-';
							}
							if (ev.clientY + 34 + this.bubble.getBoundingClientRect().height > window.innerHeight) {
								this.bubble.style.top = (ev.clientY + 34 - this.bubble.getBoundingClientRect().height) + 'px';
								cls += 'bottom';
								if (this.bubble.getBoundingClientRect().top + this.bubble.getBoundingClientRect().height > window.innerHeight) {
									cls = 'is-bottom-right';
									this.bubble.style.left = ev.clientX + 35 - this.bubble.getBoundingClientRect().width + 'px';
									this.bubble.style.top = ev.clientY - 34 - this.bubble.getBoundingClientRect().height + 'px';
								}
							} else {
								this.bubble.style.top = (ev.clientY - 34) + 'px';
								cls += 'top';
							}
							this.bubble.classList.add(cls);
						})
						.on('mouseout', function () {
							close_all_bubble('.bubble');
							delete this.bubble;
						})
						.call(
							d3	.behavior
								.drag()
								.origin(function(d) { return d; })
								.on('dragstart', function() { this.parentNode.appendChild(this); })
								.on('drag', dragmove)
						);
		node			.filter(function(d) { return d.data.label === '#exit'})
						.append('rect')
						.attr('height', function(d) { return d.dy; })
						.attr('width', function (d) { return sankey.nodeWidth()})
						.style('fill', function(d) { return 'transparent'; })
						.style('shape-rendering', 'crispEdges')
						.on('contextmenu', ocevent);
		
		node			.append('rect')
						.attr('height', function(d) { return d.dy; })
						.attr('width', function (d) { return d.data.label === '#exit' ? '2px' : sankey.nodeWidth()})
						.style('fill', function(d) { return (d.color = color(d.name.replace(/ .*/, ''))); })
						.style('stroke', function(d) { return d3.rgb(d.color).darker(1); })
						.style('shape-rendering', 'crispEdges')
						.on('contextmenu', ocevent);
		
		node			.append('text')
						.attr('x', -6)
						.attr('y', function(d) { return d.dy / 2 - 7; })
						.attr('dy', '.35em')
						.attr('text-anchor', 'end')
						.attr('transform', null)
						.on('contextmenu', ocevent)
						.text(function(d) { return d.data.label === '#exit' ? 'EXIT' : d.data.label; })
						.filter(function(d) { return d.x < width / 2; })
						.attr('x', 6 + sankey.nodeWidth())
						.attr('text-anchor', 'start');

		node			.filter(function(d) { return d.data.label === '#exit'})
						.append('path')
						.attr('shape-rendering', 'optimizeQuality')
						.attr('d', 'M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z')
						.attr('style', function (d, i) {
							return 'fill:black !important; transform: translate(3px, ' + Math.round(d.dy / 2 - 8) + 'px) scale(0.7);'
						})
						.on('contextmenu', ocevent)
						.filter(function(d) { return d.x < width / 2; })
						.attr('x', 6 + sankey.nodeWidth())
						.attr('text-anchor', 'start');
		
		node			.append('text')
						.attr('x', -6)
						.attr('y', function(d) { return d.dy / 2 + 7; })
						.attr('dy', '.35em')
						.attr('text-anchor', 'end')
						.attr('font-size', '0.75em')
						.attr('transform', null)
						.on('contextmenu', ocevent)
						.text(function(d) { return format(d.value) + ' / ' + format(math.anteil(d3.sum(data.nodes, function (dd) { if (dd.pos === d.pos) { return dd.value; }; }), d.value), 2) + '%'; })
						.filter(function(d) { return d.x < width / 2; })
						.attr('x', 6 + sankey.nodeWidth())
						.attr('text-anchor', 'start');

		node = svg		.append('g')
						.selectAll('.sankey_info')
						.data(
							d3	.nest()
								.key(function (d) { return d.pos; })
								.entries(data.nodes)
						)
						.enter()
						.append('g')
						.attr('transform', function(d) { return 'translate(' + d.values[0].x + ',' + (height + 40) + ')'; });
		node			.append('text')
						.attr('x', function (d) { 
							if (d.values[0].x < 15) { return 0; }
							if (d.values[0].x > width - 15 - margin.right) { return 15; }
							return 7.5;
						})
						.attr('y', 0)
						.attr('text-anchor', function (d) { 
							if (d.values[0].x < 15) { return 'start'; }
							if (d.values[0].x > width - 15 - margin.right) { return 'end'; }
							return 'middle';
						})
						.text(function (d) { return +d.key === 0 ? 'Basis' : 'Schritt ' + d.key; });
						
		node			.append('text')
						.attr('x', function (d) { 
							if (d.values[0].x < 15) { return 0; }
							if (d.values[0].x > width - 15 - margin.right) { return 15; }
							return 7.5;
						})
						.attr('y', 12)
						.attr('text-anchor', function (d) { 
							if (d.values[0].x < 15) { return 'start'; }
							if (d.values[0].x > width - 15 - margin.right) { return 'end'; }
							return 'middle';
						})
						.text(function (d) { return format(d3.sum(data.nodes, function (dd) { if (dd.pos === d.values[0].pos) { return dd.value; }; }), 2); });
						
		return sankey;	  
	};

function spinner(target) {
	var t = target .append('div'),
		i = 0;
	t.classed('spinner', true);
	for (; i < 10; i += 1) {
		t.append('div');
	}
}

function oeach(obj, callback) {
	var c = null,
		index = 0;
	for (c in obj) {
		if (obj.hasOwnProperty(c)) {
			callback({
				key: c,
				value: obj[c],
				obj: obj,
				index: index
			});
			index += 1;
		}
	}
}
function osize(obj) {
	var c = null,
		index = 0;
	for (c in obj) {
		if (obj.hasOwnProperty(c)) {
			index += 1;
		}
	}
	return index;
}

function conf_submit_(event) {
	event = window.event || event;
	event.preventDefault();
	
	var elements =	{
						vorkommen_min:	$('#VorkommenMin')[0],
						vorkommen_max:	$('#VorkommenMax')[0],
						schritt_min:	$('#SchritteMin')[0],
						schritt_max:	$('#SchritteMax')[0],
						zeitraum_min:	$('#ZeitraumMin')[0],
						zeitraum_max:	$('#ZeitraumMax')[0],
						btn:			$('#btn')[0]
					};
	var dis = false;
	oeach(elements, function (d) {
		if (d.value.disabled === true) {
			dis = true;
		}
	});
	
	if (dis) { return; }
		
	var c = d3	.select('.main-content')
				.append('div')
				.classed('frame', true)
				.append('div');
	c	.text('Sankeydaten werden geladen')
		.append('span')
		.classed('loading', true)
		.text('.');
	c = c	.append('div')
			.classed('status', true);
	c		.append('div')
			.classed('status_text', true);
	spinner(c);
	
	socket.emit('generate_sankey', {
		vorkommen_min:	+elements.vorkommen_min.value,
		vorkommen_max:	+elements.vorkommen_max.value,
		schritt_min:	+elements.schritt_min.value,
		schritt_max:	+elements.schritt_max.value,
		zeitraum_min:	elements.zeitraum_min.value,
		zeitraum_max:	elements.zeitraum_max.value
	});
}

function conf_submit(event, self) {
	event = window.event || event;
	event.preventDefault();
	
	var elements ={};
	
	d3	.select(self)
		.selectAll('input,select,textarea')
		.each(function () {
			if (elements[this.getAttribute('name')]) {
				if (typeof elements[this.getAttribute('name')] === 'object' && elements[this.getAttribute('name')] instanceof Array) {
					elements[this.getAttribute('name')].push(this);
				} else {
					elements[this.getAttribute('name')] = [elements[this.getAttribute('name')], this];
				}
			} else {
				elements[this.getAttribute('name')] = this;
			}
		});
		
	var dis = false;
	oeach(elements, function (d) {
		if (d.value instanceof Array) {
			var v1 = d.value[0].value,
				v2 = d.value[1].value;
			elements[d.key] = [v1, v2];
			if (d.value[0].disabled === true || d.value[1].disabled === true) {
				dis = true;
			}
		} else {
			if (d.value.multiple) {
				var opt = [];
				d3	.select(d.value)
					.selectAll('option')
					.each(function () {
						if (this.selected) {
							opt.push(this.value);
						}
					});
				elements[d.key] = opt;
			} else {
				if (d.value.value == +d.value.value) {
					elements[d.key] = +d.value.value
				} else {
					elements[d.key] = d.value.value
				}
			}
			if (d.value.disabled === true) {
				dis = true;
			}
		}
	});
	if (dis) { return; }
	
	var c = d3	.select('.main-content')
				.append('div')
				.classed('frame', true)
				.append('div');
				
	c			.text('Sankeydaten werden geladen')
				.append('span')
				.classed('loading', true)
				.text('.');
				
	c = c		.append('div')
				.classed('status', true);
	c			.append('div')
				.classed('status_text', true);
	spinner(c);
	
	localStorage.settings = JSON.stringify(elements);
	
	socket.emit('generate_sankey', elements);
}

function load_base_param(base) {
	var elements =	{
						vorkommen_min:	$('#VorkommenMin')[0],
						vorkommen_max:	$('#VorkommenMax')[0],
						schritt_min:	$('#SchritteMin')[0],
						schritt_max:	$('#SchritteMax')[0],
						zeitraum_min:	$('#ZeitraumMin')[0],
						zeitraum_max:	$('#ZeitraumMax')[0]
					};
	oeach(elements, function (d) {
		d.value.disabled = true;
	});
	var t = d3	.select('.sidebar')
				.append('div')
				.classed('frame', true)
				.append('div');
	t			.text('Konfigurationsdaten werden geladen')
				.append('span')
				.classed('loading', true)
				.text('.');

	spinner(t);
	param.base = base;
	
	socket.emit('load_base_param', {base: base});
}

window.addEventListener(
	'mousedown',
	function (ev) {
		ev = window.event || ev;
		var trg = ev.target;
		
		while (trg !== document.body && trg !== null) {
			if (trg === document.querySelector('#context')) {
				return;
			}
			trg = trg.parentNode;
		}		
		
		d3		.select('#context')
				.remove();
	}
);

window.addEventListener(
	'load',
	function () {
		var	  img1 = new Image(),
			  img2 = new Image();
			  
		img1.src = '/img/ic_router_black_24dp_1x.png';
		img2.src = '/img/ic_desktop_windows_black_24dp_1x.png';
		
		d3.sankey = function() {
		  var sankey = {},
			  nodeWidth = 24,
			  nodePadding = 8,
			  size = [1, 1],
			  nodes = [],
			  links = [];

		  sankey.nodeWidth = function(_) {
			if (!arguments.length) return nodeWidth;
			nodeWidth = +_;
			return sankey;
		  };

		  sankey.nodePadding = function(_) {
			if (!arguments.length) return nodePadding;
			nodePadding = +_;
			return sankey;
		  };

		  sankey.nodes = function(_) {
			if (!arguments.length) return nodes;
			nodes = _;
			return sankey;
		  };

		  sankey.links = function(_) {
			if (!arguments.length) return links;
			links = _;
			return sankey;
		  };

		  sankey.size = function(_) {
			if (!arguments.length) return size;
			size = _;
			return sankey;
		  };

		  sankey.layout = function(iterations) {
			computeNodeLinks();
			computeNodeValues();
			computeNodeBreadths();
			computeNodeDepths(iterations);
			computeLinkDepths();
			return sankey;
		  };

		  sankey.relayout = function() {
			computeLinkDepths();
			return sankey;
		  };
			
		  sankey.reversibleLink = function () {
			  function t(t, n) {
				  var r = n.source.x + n.source.dx,
					  i = n.target.x,
					  s = d3.interpolateNumber(r, i),
					  o = s(e),
					  u = s(1 - e),
					  a = n.source.y + n.sy,
					  f = n.target.y + n.ty,
					  l = n.source.y + n.sy + n.dy,
					  c = n.target.y + n.ty + n.dy;
				  switch (t) {
					  case 0: return "M"+r+","+a+"L"+r+","+(a+n.dy);
					  case 1: return "M"+r+","+a+"C"+o+","+a+" "+u+","+f+" "+i+","+f+"L"+i+","+c+"C"+u+","+c+" "+o+","+l+" "+r+","+l+"Z";
					  case 2: return "M"+i+","+f+"L"+i+","+(f+n.dy);
				  }
			  }
			  function n(e, t) {
				  function i(e){
					  return ((e.source.y + e.sy) > (e.target.y + e.ty)) ? -1 : 1;
				  }
				  function s(e,t) {
					  return e+","+t+" ";
				  }
				  var n = 30;
				  var r = 15;
				  var o = i(t)*r,
					  u = t.source.x + t.source.dx,
					  a = t.source.y + t.sy,
					  f = t.target.x,
					  l = t.target.y + t.ty;
				  switch (e) {
					  case 0: return "M"+s(u,a)+"C"+s(u,a)+s(u+n,a)+s(u+n,a+o)+"L"+s(u+n,a+o+t.dy)+"C"+s(u+n,a+t.dy)+s(u,a+t.dy)+s(u,a+t.dy)+"Z";
					  case 1: return "M"+s(u+n,a+o)+"C"+s(u+n,a+3*o)+s(f-n,l-3*o)+s(f-n,l-o)+"L"+s(f-n,l-o+t.dy)+"C"+s(f-n,l-3*o+t.dy)+s(u+n,a+3*o+t.dy)+s(u+n,a+o+t.dy)+"Z";
					  case 2: return "M"+s(f-n,l-o)+"C"+s(f-n,l)+s(f,l)+s(f,l)+"L"+s(f,l+t.dy)+"C"+s(f,l+t.dy)+s(f-n,l+t.dy)+s(f-n,l+t.dy-o)+"Z";
				  }
			  }
			  var e = .5;
			  return function (e) {
				  return function (r) {
					  if (r.source.x < r.target.x) {
						  return t(e,r);
					  } else { 
						  return n(e,r);
					  }
				  }
			  }
		  };
			
		  sankey.link = function() {
			var curvature = .5;

			function link(d) {
			  var x0 = d.source.x + d.source.dx,
				  x1 = d.target.x,
				  xi = d3.interpolateNumber(x0, x1),
				  x2 = xi(curvature),
				  x3 = xi(1 - curvature),
				  y0 = d.source.y + d.sy + d.dy / 2,
				  y1 = d.target.y + d.ty + d.dy / 2;
			  return "M" + x0 + "," + y0
				   + "C" + x2 + "," + y0
				   + " " + x3 + "," + y1
				   + " " + x1 + "," + y1;
			}

			link.curvature = function(_) {
			  if (!arguments.length) return curvature;
			  curvature = +_;
			  return link;
			};

			return link;
		  };

		  // Populate the sourceLinks and targetLinks for each node.
		  // Also, if the source and target are not objects, assume they are indices.
		  function computeNodeLinks() {
			nodes.forEach(function(node) {
			  node.sourceLinks = [];
			  node.targetLinks = [];
			});
			links.forEach(function(link) {
			  var source = link.source,
				  target = link.target;
			  if (typeof source === "number") source = link.source = nodes[link.source];
			  if (typeof target === "number") target = link.target = nodes[link.target];
			  source.sourceLinks.push(link);
			  target.targetLinks.push(link);
			});
		  }

		  // Compute the value (size) of each node by summing the associated links.
		  function computeNodeValues() {
			nodes.forEach(function(node) {
			  node.value = Math.max(
				d3.sum(node.sourceLinks, value),
				d3.sum(node.targetLinks, value)
			  );
			});
		  }

		  // Iteratively assign the breadth (x-position) for each node.
		  // Nodes are assigned the maximum breadth of incoming neighbors plus one;
		  // nodes with no incoming links are assigned breadth zero, while
		  // nodes with no outgoing links are assigned the maximum breadth.
		  function computeNodeBreadths() {
			var remainingNodes = nodes,
				nextNodes,
				x = 0;
			while (remainingNodes.length) {
			  nextNodes = [];
			  remainingNodes.forEach(function(node) {
				if (node.xPos !== undefined) {
					x = node.xPos;
				}
				node.x = x;
				node.dx = nodeWidth;
				node.sourceLinks.forEach(function(link) {
				  if (nextNodes.indexOf(link.target) < 0) {
					nextNodes.push(link.target);
				  }
				});
			  });
			  remainingNodes = nextNodes;
			  ++x;
			}

			// OUT BECAUSE OF node.xPos
			//moveSinksRight(x);
			scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
		  }

		  function moveSourcesRight() {
			nodes.forEach(function(node) {
			  if (!node.targetLinks.length) {
				node.x = d3.min(node.sourceLinks, function(d) { return d.target.x; }) - 1;
			  }
			});
		  }

		  function moveSinksRight(x) {
			nodes.forEach(function(node) {
			  if (!node.sourceLinks.length) {
				node.x = x - 1;
			  }
			});
		  }

		  function scaleNodeBreadths(kx) {
			nodes.forEach(function(node) {
			  node.x *= kx;
			});
		  }

		  function computeNodeDepths(iterations) {
			var nodesByBreadth = d3.nest()
				.key(function(d) { return d.x; })
				.sortKeys(d3.ascending)
				.entries(nodes)
				.map(function(d) { return d.values; });

			//
			initializeNodeDepth();
			resolveCollisions();
			for (var alpha = 1; iterations > 0; --iterations) {
			  relaxRightToLeft(alpha *= .99);
			  resolveCollisions();
			  relaxLeftToRight(alpha);
			  resolveCollisions();
			}

			function initializeNodeDepth() {
			  var ky = d3.min(nodesByBreadth, function(nodes) {
				return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value);
			  });

			  nodesByBreadth.forEach(function(nodes) {
				nodes.forEach(function(node, i) {
				  node.y = i;
				  node.dy = node.value * ky;
				});
			  });

			  links.forEach(function(link) {
				link.dy = link.value * ky;
			  });
			}

			function relaxLeftToRight(alpha) {
			  nodesByBreadth.forEach(function(nodes, breadth) {
				nodes.forEach(function(node) {
				  if (node.targetLinks.length) {
					var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
					node.y += (y - center(node)) * alpha;
				  }
				});
			  });

			  function weightedSource(link) {
				return center(link.source) * link.value;
			  }
			}

			function relaxRightToLeft(alpha) {
			  nodesByBreadth.slice().reverse().forEach(function(nodes) {
				nodes.forEach(function(node) {
				  if (node.sourceLinks.length) {
					var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
					node.y += (y - center(node)) * alpha;
				  }
				});
			  });

			  function weightedTarget(link) {
				return center(link.target) * link.value;
			  }
			}

			function resolveCollisions() {
			  nodesByBreadth.forEach(function(nodes) {
				var node,
					dy,
					y0 = 0,
					n = nodes.length,
					i;

				// Push any overlapping nodes down.
				nodes.sort(ascendingDepth);
				for (i = 0; i < n; ++i) {
				  node = nodes[i];
				  dy = y0 - node.y;
				  if (dy > 0) node.y += dy;
				  y0 = node.y + node.dy + nodePadding;
				}

				// If the bottommost node goes outside the bounds, push it back up.
				dy = y0 - nodePadding - size[1];
				if (dy > 0) {
				  y0 = node.y -= dy;

				  // Push any overlapping nodes back up.
				  for (i = n - 2; i >= 0; --i) {
					node = nodes[i];
					dy = node.y + node.dy + nodePadding - y0;
					if (dy > 0) node.y -= dy;
					y0 = node.y;
				  }
				}
			  });
			}

			function ascendingDepth(a, b) {
			  return a.y - b.y;
			}
		  }

		  function computeLinkDepths() {
			nodes.forEach(function(node) {
			  node.sourceLinks.sort(ascendingTargetDepth);
			  node.targetLinks.sort(ascendingSourceDepth);
			});
			nodes.forEach(function(node) {
			  var sy = 0, ty = 0;
			  node.sourceLinks.forEach(function(link) {
				link.sy = sy;
				sy += link.dy;
			  });
			  node.targetLinks.forEach(function(link) {
				link.ty = ty;
				ty += link.dy;
			  });
			});

			function ascendingSourceDepth(a, b) {
			  return a.source.y - b.source.y;
			}

			function ascendingTargetDepth(a, b) {
			  return a.target.y - b.target.y;
			}
		  }

		  function center(node) {
			return node.y + node.dy / 2;
		  }

		  function value(link) {
			return link.value;
		  }

		  return sankey;
		};
		
		if (typeof io !== 'undefined') {
			socket = io.connect(url + ':' + port);
			/*
			window.setInterval(
				function () {
					if (socket.connected === false) {
						socket.disconnected_ts = socket.disconnected_ts || new Date();
						socket.server_was_disconnected = true;
						d3.selectAll('.frame').remove();
				
						var c = d3	.select('.main-content')
									.append('div')
									.classed('frame', true)
									.append('div');
						c	.text('Verbindung zum Server verloren, ein Neustart des Tools ist daher nötig. ');
						c	.append('p')
							.text('Server ist derzeit nicht erreichbar...');
						c	.append('p')
							.text(socket.disconnected_ts);
						c	.append('div')
							.style('text-align', 'center')
							.style('margin-top', '10px')
							.append('button')
							.text('Jetzt neustarten')
							.attr('disabled', 'disabled')
							.style('width', '300px')
							.style('opacity', '0.5')
							.on('click', function () { window.location.reload(); });
					} else if (socket.server_was_disconnected === true) {
						delete socket.server_was_disconnected;
						d3.selectAll('.frame').remove();
				
						var c = d3	.select('.main-content')
									.append('div')
									.classed('frame', true)
									.append('div');
						c	.text('Verbindung zum Server war unterbrochen, ein Neustart des Tools ist daher nötig.' + socket.disconnected_ts);
						c	.append('p')
							.text(socket.disconnected_ts);
						c	.append('div')
							.style('text-align', 'center')
							.style('margin-top', '10px')
							.append('button')
							.text('Jetzt neustarten')
							.style('width', '300px')
							.on('click', function () { window.location.reload(); });
						
					}
				},
				500
			);
			*/
			socket.on('base_param', function (data) {
				var convert_date = function (d) {
						d = new Date(d);
						d.setSeconds(0);
						return d.toISOString().replace(/.000Z/, '');
					},
					elements = 	{
									vorkommen_min:	$('#VorkommenMin')[0],
									vorkommen_max:	$('#VorkommenMax')[0],
									schritt_min:	$('#SchritteMin')[0],
									schritt_max:	$('#SchritteMax')[0],
									zeitraum_min:	$('#ZeitraumMin')[0],
									zeitraum_max:	$('#ZeitraumMax')[0],
									drilldown:		$('#DrilldownList')[0],
									important:		$('#ImportantList')[0],
									sum:			d3.select('#Sum'),
									filter:			d3.select('#filter'),
									hidden:			$('#HiddenList')[0]
								};
				var created = new Date(data.metadata.meta.created);
				help_text[0] = 	'<h1>' + $('#base')[0].value + '</h1>' +
								data.metadata.meta.description +
								'<p style="font-size:0.8em;">&bull; Angefordert von ' + data.metadata.meta.owner +
								'<br />&bull; Aktualisiert am ' + zf(created.getDate()) + '.' + zf(created.getMonth() + 1) + '.' + created.getFullYear() + ' um ' + zf(created.getHours()) + ':' + zf(created.getMinutes()) + ' Uhr</p>' +
								'Informationen zu anderen Datenquellen finden Sie unter "<span onclick="sourcesinfo();" style="cursor:pointer;">Datenquelleninformationen</span>".'				
				d3.selectAll('.frame').remove();
				d3.selectAll('#settings.is-invisible').classed('is-invisible', false);
				if (data.metadata) {
					data.metadata.date.min = convert_date(data.metadata.date.min);
					data.metadata.date.start = convert_date(data.metadata.date.start);
					data.metadata.date.max = convert_date(data.metadata.date.max);
					data.metadata.date.end = convert_date(data.metadata.date.end);
					
					elements.vorkommen_min.value = 0;
					elements.vorkommen_max.value = 999999999;

					elements.schritt_max.min = elements.schritt_min.min = data.metadata.steps.min;
					elements.schritt_min.value = data.metadata.steps.start;
					elements.schritt_min.max = elements.schritt_max.max = data.metadata.steps.max;
					elements.schritt_max.value = data.metadata.steps.end;
					
					elements.zeitraum_max.min = elements.zeitraum_min.min = data.metadata.date.min;
					elements.zeitraum_min.value = data.metadata.date.start;
					elements.zeitraum_min.max = elements.zeitraum_max.max = data.metadata.date.max;
					elements.zeitraum_max.value = data.metadata.date.end;
					
					elements.drilldown.innerHTML = '<li>Kein Drilldown hinterlegt</li>';
					elements.important.innerHTML = '<li>Keine wichtigen Knoten definiert</li>';
					elements.hidden.innerHTML = '<li>Keine versteckten Knoten definiert</li>';
					
					elements.sum	.selectAll('option')
									.remove();
					
					elements.sum	.selectAll('option')
									.data(d3.entries(data.metadata.sum))
									.enter()
									.append('option')
									.attr('value', function (d, i) {
										return d.key;
									})
									.text(function (d, i) { 
										return d.value;
									});
									
					elements.filter	.selectAll('.area')
									.remove();

					elements.filter	.selectAll('.area')
									.data(data.metadata.filter)
									.enter()
									.append('div')
									.classed('area', true)
									.each(function (d, i) {
										var self = d3.select(this),
											h = self.append('div');
										if (i === 0) {
											h	.classed('help', true);
											h	.append('label')
												.text(d.label);
												
											h	.append('div')
												.classed('material-icons', true)
												.text('live_help');
												
											h	.on('mouseover', function () {
													help(6, false, undefined, true);
												});
												
											h	.on('mouseout', function () {
													help(0);
												});
											
										} else {
											self	.append('label')
													.text(d.label);
										}
										
										switch (d.type) {
											case 'range':
												var box = self.append('div');
												
												box.classed('range', true);
												
												box		.append('input')
														.attr('type', d.variant.type)
														.attr('name', 'filter_' + d.type + '_' + d.field)
														.attr('required', d.required ? 'required' : undefined)
														.attr('value', d.default ? d.default.start : '')
														.attr('step', d.variant.step)
														.attr('max', d.variant.max)
														.attr('min', d.variant.min)
														.attr('placeholder', '-');
														
												box		.append('input')
														.attr('type', d.variant.type)
														.attr('name', 'filter_' + d.type + '_' + d.field )
														.attr('required', d.required ? 'required' : undefined)
														.attr('value', d.default ? d.default.end : '')
														.attr('step', d.variant.step)
														.attr('max', d.variant.max)
														.attr('min', d.variant.min)
														.attr('placeholder', '-');
												break;
											case 'multilist':
												self	.append('select')
														.attr('multiple', 'multiple')
														.attr('name', 'filter_' + d.type + '_' + d.field)
														.selectAll('option')
														.data(d.variant)
														.enter()
														.append('option')
														.attr('selected', function (dd, ii) {
															return (dd.value === d.default ? 'selected' : undefined);
														})
														.text(function (d, i) {
															return d.label;
														})
														.attr('value', function (d, i) {
															return d.value;
														});
														
												if (d.required === true) {
													self	.select('select')
															.attr('required', 'required');
												}
												break;
											case 'list':
												self	.append('select')
														.on('focus', function () {
															/*help(6);*/
														})
														.attr('name', 'filter_' + d.type + '_' + d.field)
														.selectAll('option')
														.data(d.variant)
														.enter()
														.append('option')
														.attr('selected', function (dd, ii) {
															return (dd.value === d.default ? 'selected' : undefined);
														})
														.text(function (d, i) {
															return d.label;
														})
														.attr('value', function (d, i) {
															return d.value;
														});
														
												if (d.required === false) {
													self	.select('select')
															.append('option')
															.text('- ' + d.label + ' nicht filtern -')
															.attr('value', 'ignore_filter')
															.attr('selected', (false === d.default ? 'selected' : undefined));
												}
											break;
										}
									});
					
					oeach(elements, function (d) {
						if (d.value instanceof Array) {
							d.value.attr('disabled', undefined);
						} else {
							d.value.disabled = false;
						}
					});
				}
			});
			socket.on('status', function (data) {
				var text = '';
				switch (data.s) {
					case 0: text = 'Lade ' + data.c + ' von der Datenbank'; break;
					case 1: text = 'Daten werden kumuliert.'; break;
					case 2: text = 'Verbindungen werden für die Sankeydarstellung vorbereitet.'; break;
				}
					
				d3.select('.status_text').text(text);
			});
			socket.on('error_code', function (data) {
				console.error(data);
				
				d3.selectAll('.frame').remove();
				
				var c = d3	.select('.main-content')
							.append('div')
							.classed('frame', true)
							.append('div');
				c	.text('Auf dem Server ist ein Fehler aufgetreten :-(')
					.append('pre')
					.text(JSON.stringify(data));
			});
			socket.on('help_content', function (data) {
				var el = d3.select(data.target);
				if (!el.empty()) {
					el.node().innerHTML = '';
					
					if (data.base === undefined) {
						el.append('div').text('Keine Metadaten vorhanden.');
					} else {
						var d = data.base[0].metadata;
						el.append('div').text(d.meta.description);
						var con = el.append('div'),
							date = new Date(d.meta.created);
						
						var filterlist = [];
						oeach(d.filter, function (o) {
							filterlist.push(o.value.label);
						});
						
						con.style('display', 'flex');
						con.style('justify-content', 'space-between');
						con.style('flex-wrap', 'wrap');
						
						con.append('div').style('font-size', '0.8em').text('Angefordert von ' + d.meta.owner);
						con.append('div').style('font-size', '0.8em').text('Mögliche Kumulationen: ' + d3.values(d.sum).join(', '));
						
						con = el.append('div');
						
						con.style('display', 'flex');
						con.style('justify-content', 'space-between');
						con.style('flex-wrap', 'wrap');
						
						con.append('div').style('font-size', '0.8em').text('Aktualisiert am ' + zf(date.getDate()) + '.' + zf(date.getMonth() + 1) + '.' + date.getFullYear() + ' um ' + zf(date.getHours()) + ':' + zf(date.getMinutes()) + ' Uhr');
						con.append('div').style('font-size', '0.8em').text('Mögliche Filter: ' + filterlist.join(', '));
						
					}
					el	.append('button')
						.style('margin-top', '10px')
						.text('Datenquelle auswählen')
						.attr('data-value', data.content)
						.on('click', function () {
							$('#base')[0].value = this.getAttribute('data-value');
							$('#base')[0].onchange();
							$('.close')[0].click();
						});
				}
			});
			socket.on('help', function (data) {
				var el = document.querySelector('.layer-content');
				if (el) {
					el.innerHTML = data;
				}
			});
			socket.on('configdata', function (data) {
				localStorage.node_settings = JSON.stringify(data);
			});
			
			socket.on('generate', function (data) {
				var elements = 	{
									vorkommen_min:	$('#VorkommenMin')[0],
									vorkommen_max:	$('#VorkommenMax')[0],
									schritt_min:	$('#SchritteMin')[0],
									schritt_max:	$('#SchritteMax')[0],
									zeitraum_min:	$('#ZeitraumMin')[0],
									zeitraum_max:	$('#ZeitraumMax')[0],
									drilldown:		$('#DrilldownList')[0],
									important:		$('#ImportantList')[0],
									hidden:			$('#HiddenList')[0],
									main:			$('.main-content')[0]
								};
				d3.selectAll('.frame').remove();
				if (osize(data.drilldown) === 0) {
					elements.drilldown.innerHTML = '<li>Kein Drilldown hinterlegt</li>';
				} else {
					d3.select(elements.drilldown).selectAll('li').remove();
					d3	.select(elements.drilldown)
						.selectAll('li')
						.data(d3.entries(data.drilldown))
						.enter()
						.append('li')
						.style('cursor', 'pointer')
						.text(
							function (d) {
								return d.key;
							}
						).
						on('click', function (d) {
							help(0);
							change({
								'type': 'drillup',
								'name': d.value.drill.join('.') + '.drillup',
								'target': d.value.pos
							});
						});
				}
				if (osize(data.important) === 0) {
					elements.important.innerHTML = '<li>Keine wichtigen Knoten definiert</li>';
				} else {
					d3	.select(elements.important).selectAll('li').remove();
					d3	.select(elements.important)
						.selectAll('li')
						.data(d3.entries(data.important))
						.enter()
						.append('li')
						.style('cursor', 'pointer')
						.text(
							function (d) {
								return d.key + '.' + d.value;
							}
						).
						on('click', function (d) {
							help(0);
							change({
								'type': 'important_remove',
								'name': d.value,
								'target': d.key
							});
						});
				}
				if (osize(data.hidden) === 0) {
					elements.hidden.innerHTML = '<li>Keine versteckten Knoten definiert</li>';
				} else {
					d3	.select(elements.hidden).selectAll('li').remove();
					d3	.select(elements.hidden)
						.selectAll('li')
						.data(d3.entries(data.hidden))
						.enter()
						.append('li')
						.style('cursor', 'pointer')
						.text(
							function (d) {
								return d.key;
							}
						).
						on('click', function (d) {
							help(0);
							change({
								'type': 'filter_remove',
								'name': d.value,
								'target': d.value.pos
							});
						});
				}
				if (data.nodes && data.links) {
					redodata.set	= true;
					redodata.target	= elements.main;
					redodata.data	= data;
					redodata.attr	= {
						onclick: function (ev) {
							help(0);
							ev = window.event || ev;
							var self = ev.target,
								data = self.__data__,
								bb = self.getBoundingClientRect(),
								context = d3.select(document.body).append('div');
							
							ev.preventDefault();
							
							d3		.select('#context')
									.remove();
							
							context	.attr('id', 'context');
							context	.style('min-width', '300px');
							context	.style('top', ev.y + 'px');
							context	.style('left', ev.x + 'px');
							
							context .append('h1')
									.text(data.data.pos + '.' + data.data.label);
							
							context	.append(data.drill !== 'N3' ? 'div' : 'span')
									.text('Drilldown und nur Pfade mit diesem Knoten anzeigen')
									.on('click', function (d, i) {
										var target = 'PC';
										switch (data.drill) {
											case 'PC': target = 'N1'; break;
											case 'N1': target = 'N2'; break;
											case 'N2': target = 'N3'; break;
										}
										change({
											'type': 'drill+important',
											'drill': {
												'name': data.data.label,
												'target': data.data.pos
											},
											'important': {
												'name': data.data.label,
												'target': data.data.pos
											}
										});
									});
							
							context	.append('hr');
							
							context	.append(data.drill !== 'PC' ? 'div' : 'span')
									.text('Drillup')
									.on('click', function (d, i) {
										change({
											'type': 'drillup',
											'name': data.data.label,
											'target': data.data.pos
										});
									});	
							
							context	.append(data.drill !== 'N3' ? 'div' : 'span')
									.text('Drilldown')
									.on('click', function (d, i) {
										change({
											'type': 'drilldown',
											'name': data.data.label,
											'target': data.data.pos
										});
									});
									
							context	.append('hr');
									
							context	.append('div')
									.text('Nur Pfade mit diesem Knoten anzeigen')
									.on('click', function (d, i) {
										change({
											'type': 'important',
											'name': data.data.label,
											'target': data.data.pos
										});
									});
									
							context	.append('div')
									.text('Pfade, die durch diesen Knoten gehen, ausblenden')
									.on('click', function (d, i) {
										change({
											'type': 'filter',
											'name': data.data.label,
											'target': data.data.pos
										});
									});
									
							bb = context.node().getBoundingClientRect();
							if (bb.left + bb.width > window.innerWidth) {
								context.style('left', (window.innerWidth - bb.width) + 'px');
							}
							if (bb.top + bb.height > window.innerHeight) {
								context.style('top', (window.innerHeight - bb.height) + 'px');
							}
						}						
					};
					d3sankey(
						redodata.target,
						redodata.data,
						redodata.attr
					);
					if (helptype_ok[6] === undefined) {
						//help(7);
					} else {
						//help(8, undefined, [40, document.querySelector('#DrilldownList').getBoundingClientRect().top - 250]);
					}
				} else {
					elements.main.innerHTML = '<p>Fehler beim Laden der Sankeydaten :-(</p>';
				}
			});
		}
	},
	false
);

