/*
 * Copyright (C) 2011 by Enno Boland <g s01 de>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function($) {

var NS = "__rich"
var style = "<style id='"+NS+"'>"
	+"."+NS+"_outer {position:relative;display:block-inline;height:100px;width:400px;border:1px inset;}"
	+"."+NS+"_editor {position:absolute;left:0;top:0;right:0;bottom:0;background:transparent !important; border:none;z-index:1;margin:0px; visibility:hidden; width:100%;}"
	+"."+NS+"_editor * { position:absolute; left:0; top:0; width:100%; height: 100%; border:none; margin:0px;}"
	+"."+NS+"_toolbar {position:absolute;left:0;right:0;}"
	+"."+NS+"_active {visibility:visible;}"
	+"</style>";
var innerstyle = "<style>"
	+"body {background:white; font-family:sans-serif; margin:0;padding:0;}";
	+"</style>";

function toggler(label) {
	var button = $('<input type="checkbox" id="id" class="'+NS+'_button"><label for="id"></label>')
	button.eq(0).data('label', label)
	button.eq(1).html(label)
	return button;
}
function cmdButton(label, command) {
	var isEnabled = function(b) {
		var z = $(b).zeditor()[0];
		return (z.queryCommandEnabled && z.queryCommandEnabled(command));
	}
	var button = toggler(label);
	button.eq(0)
		.bind({
		click: function() {
			var z = $(this).zeditor();
			z[0].execCommand(command, false, true)
			z.focus();
		},
		update: function() {
			var b = $(this)
			this.disabled = !isEnabled(this);
			this.checked = b.zeditor()[0].queryCommandState && b.zeditor()[0].queryCommandState(command);
			b.button('refresh');
		}
	})
	return button;
}
var tools = {
	bold: { item: cmdButton('B','bold'), key: 'ctrl+b' },
	italic: { item: cmdButton('I','italic'), key: 'ctrl+i' },
	underline: { item: cmdButton('U','underline'), key: 'ctrl+u' },
	undo: { item: cmdButton('ui-icon-arrowreturnthick-1-w','undo'), key: 'ctrl+z' },
	redo: { item: cmdButton('ui-icon-arrowreturnthick-1-e','redo'), key: 'ctrl+shift+z' },
	source: {
		item: toggler('ui-icon-carat-2-e-w').eq(0).bind({
			click: function() {
				$(this).parents('.'+NS+'_outer').find('.'+NS+'_editor *').toggleClass(NS+"_active");
			}
		}).end(),
		key: 'ctrl+h' }
}
var defaultOptions = {
	toolbar:'top', // above, inline, below
	tools: [ ['bold', 'italic', 'underline'], [ 'undo', 'redo' ], 'source' ]
}

function init(text, options) {
	if($("#"+NS).length == 0)
		$('head').prepend(style);
	options = $.extend({}, defaultOptions, options);

	var outer = $('<div>')
		.attr('class', NS+'_outer '+text.attr('class'))
	var toolbar = $('<span class="'+NS+'_toolbar ui-widget-header ui-corner-all">')
	var editarea = $('<div class="'+NS+'_editor">')
	var rich = $('<iframe src="about:blank" class="'+NS+'_rich '+NS+'_active">');
	text.attr('class', NS+'_plain')

	text.after(outer);
	outer.append(toolbar)
		.append(editarea);
	editarea.append(rich)
		.append(text)
	

	var step2 = function() {
		step2 = function() {}
		var content = rich.contents();
		content[0].contentEditable = true;
		content[0].designMode = 'On';
		content.find('head').prepend(options.css
				? $('<link rel="stylesheet" type="text/css" />').attr('href', options.css)
				: innerstyle);
		var body = content.find('body');
		body.html(text.val())
		content.bind('paste click cut keyup mouseup focus blur', function(e) {
			outer.find('.'+NS+'_toolbar *').trigger('update');
			if(text.val() != body.html()) {
				text.val(body.html())
				text.change();
			}
		})
		text.change(function() {
			var html = content.find('body').html();
			outer.find('.'+NS+'_toolbar *').trigger('update');
			if(text.val() != body.html()) {
				body.html(text.val())
				text.change();
			}
		})
		$.each(options.tools, function(i,v) {
			var add = function(p, tool) {
				var t = tool.item.clone(true)
				var r = Math.random().toString().replace('.','');
				t.filter('[id]').each(function() {
					$(this).attr('id',$(this).attr('id')+r)
				})
				t.filter('[for]').each(function() {
					$(this).attr('for',$(this).attr('for')+r)
				})
				t.bind('click.'+NS, function() { outer.find('.'+NS+'_toolbar *').trigger('update'); })
				p.append(t);
				if(jQuery.hotkeys && tool.key) {
					content.bind('keydown', tool.key, function() {
						t.click();
						return false;
					})
				}
				return t;
			};
			if($.isArray(v)) {
				var set = $("<span class='"+NS+"_group'>")
				$.each(v, function(i,v) {
					add(set, tools[v])
				});
				toolbar.append(set);
			}
			else
				add(toolbar, tools[v]);
		});
		toolbar.children('.'+NS+'_group').buttonset();
		toolbar.children('.'+NS+'_button').button();

		toolbar.find('.ui-button').each(function() {
			var t = $(this)
			var label = t.text()
			var isicon = label.match(/^ui-/)
			t.button({
				text: !isicon,
				icons: {
					primary: isicon ? label : null
				}
			});
		})
		outer.append(toolbar);
		if(options.toolbar != 'inline') {
			outer.find('.'+NS+'_editor').css('margin-'+options.toolbar, toolbar.height()+2)
			toolbar.css(options.toolbar, 0);
		}
		outer.find('.'+NS+'_toolbar *').trigger('update');
	}
	setTimeout(step2, 200)
	rich.load(step2);
}


$.fn.zeditor = function(options) {
	var editor = this.parents().andSelf().filter('.'+NS+'_outer').find('.'+NS+'_active');
	if(editor[0] && editor.hasClass(NS+'_rich'))
		editor = editor.contents();
	if(options == undefined) {
		return editor;
	}
	else if($.isPlainObject(options)) this.each(function() {
		init($(this), options)
	})
	return this;
}
})(jQuery)
