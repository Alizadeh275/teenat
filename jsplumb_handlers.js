/*  
% File Structure:
1. Variables Segment
2. Functions Segment
3. Actions Segment:
    - JsPlumb Actions
    - Runing Action
**************************************************************
% JsPlumb Actions:
In this file we hand all actions in the workspase page
The actions divide into two category:
1. jsPlumb actions:
    - drag a node from nodes segment
    - drop a node into workspace
    - delete a node from workspace
    - add connection between nodes in workspace
    - delete connection from nodes
    - click on a node in workspace
2. Running Action:
    - click on run button in node_info segment
 **************************************************************
   



/*----------------------  Variables  ------------------------- */

//  var host = 'http://localhost:8000/';
var host = 'https://tenat.pythonanywhere.com/';
var instance = jsPlumb.getInstance({});
instance.setContainer("workspace");


// color of each state
const StateColor = {
    Created: 'secondary',
    Ready: 'info',
    Running: 'warning',
    Completed: 'success',
    Failed: 'danger',
    get_state_name: function(color) {
        if (color == 'secondary') {
            return 'Created';
        } else if (color == 'info') {
            return 'Ready';
        } else if (color == 'warning') {
            return 'Running';
        } else if (color == 'success') {
            return 'Completed';
        } else if (color == 'danger') {
            return 'Failed';
        }
    }
}

//  api fields
import_collection_api_fields = { name: 'file_name', file: 'file' };

// tokenization is always after import..so from = source_node
tokenization_api_fields = { name: 'file_name', from: 'source_node', splitter: 'splitter' };

stopword_removal_api_fields = { name: 'file_name', from: 'source_address', language: 'language' };
doc_statistics_api_fields = { name: 'file_name', from: 'source_address', language: 'language' };
stemming_api_fields = { name: 'file_name', from: 'source_address', language: 'language' };
export_file_api_fields = { name: 'file_name', from: 'source_address', output_format: 'output_format' };


// api object
let import_collection_api = { name: 'import_collection', url: 'api/import/', fields: import_collection_api_fields }
let tokenization_api = { name: 'tokenization', url: 'api/tokenize/', fields: tokenization_api_fields }
let stopword_removal_api = {
    name: 'stopword_removal',
    url: 'api/stop-word-removal/',
    fields: stopword_removal_api_fields
}
let doc_statistics_api = { name: 'doc_statistics', url: 'api/doc-statistics/', fields: doc_statistics_api_fields }
let stemming_api = { name: 'stemming', url: 'api/stem/', fields: stemming_api_fields }
let export_file_api = { name: 'export_file', url: 'api/export/', fields: export_file_api_fields }

// api arrays
const APIs = {
    import_collection: import_collection_api,
    tokenization: tokenization_api,
    stopword_removal: stopword_removal_api,
    doc_statistics: doc_statistics_api,
    stemming: stemming_api,
    export_file: export_file_api,

}


/*-----------------------  Functions  ------------------------- */

// function for make an uique id for each dropped node in workspace
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// function for update meta_data in node_info segment
function update_meta_data(form_selector, source_collection, source_node, source_id, source_address, state, tip) {
    // get form by form selector
    target_collection_selector = form_selector.concat(' .meta-data p.source_collection');
    target_node_selector = form_selector.concat(' .meta-data p.source_node');
    target_ID_selector = form_selector.concat(' .meta-data p.source_id');
    target_address_selector = form_selector.concat(' .meta-data p.source_address');
    target_state_selector = form_selector.concat(' .meta-data p.state');

    if (source_collection != 'default') {
        $(target_collection_selector).text(source_collection);

    }
    if (source_node != 'default') {
        $(target_node_selector).text(source_node);

    }
    if (source_id != 'default') {
        $(target_ID_selector).text(source_id);

    }

    if (source_address != 'default') {
        $(target_address_selector).text(source_address);

    }

    if (state != 'default') {
        $(target_state_selector).text(StateColor.get_state_name(state));
        text_color = 'text-'.concat(state);
        $(target_state_selector).removeClass("text-success text-info text-warning text-danger text-secondary");
        $(target_state_selector).addClass(text_color);
    }

}

// function for updating color of node in workspace segment
function update_controll_color(control_id, color) {

    text_color = 'text-'.concat(color);
    border_color = 'border-'.concat(color);

    controll_selector = 'div.control#'.concat(control_id);
    icon_selector = controll_selector.concat(' i');

    // update node name color
    $(controll_selector).removeClass("text-success text-info text-warning text-danger text-secondary");
    $(controll_selector).addClass(text_color);

    // update icon color
    $(icon_selector).removeClass("text-success text-info text-warning text-danger text-secondary");
    $(icon_selector).addClass(text_color);

    // update node border color
    $(controll_selector).removeClass("border-success border-info border-warning border-danger border-secondary");
    $(controll_selector).addClass(border_color);

}

// function that checks current connection is valid or not
function check_connection(source_node, target_node) {

    if (source_node == 'Import_Collection' &&
        (target_node == 'Tokenization')) {
        return true;
    } else if (source_node == 'Tokenization' && (target_node == 'Stemming' || target_node == 'Stopword_Removal' || target_node == 'Doc_Statistics')) {
        return true;
    } else if (source_node == 'Stemming' && (target_node == 'Export_File' || target_node == 'Stopword_Removal' || target_node == 'Doc_Statistics')) {
        return true;
    } else if (source_node == 'Stopword_Removal' && (target_node == 'Stemming' || target_node == 'Export_File' || target_node == 'Doc_Statistics')) {
        return true;
    } else if (target_node == 'Export_File' && (source_node == 'Tokenization' || source_node == 'Stemming' || source_node == 'STW_Removal' || source_node == 'Doc_Statistics')) {
        return true;
    } else return false;

}

// function that showes  preview and node_info segment of current node while clicked in workspace
function update_info_preview_segment(node_id) {
    $('form.my-form-control').addClass('d-none');
    form_selector = 'form#'.concat(node_id);
    $(form_selector).removeClass('d-none');
    // update preview table
    // if (node_name == 'Export_File') {
    //     node_name = 'Tokenization';
    // }

    $('#preview .table').addClass('d-none');
    table_selector = 'table#'.concat(node_id);
    $(table_selector).removeClass('d-none');
}
// function that creates appropriate table in preview segment  when a node dropped into workspace  
function create_preview_segment(node_id, draggable_element_id) {
    table_selector = 'table#'.concat(draggable_element_id)
    $('#preview .table').addClass('d-none');
    cloned_table = $(table_selector).clone(true);
    cloned_table.attr({
        'id': node_id,

    })
    cloned_table.removeClass('d-none')
    $('#preview').append(cloned_table);
}

// function that create appropriate node_info segement when a node dropped into workspace
function create_node_info_segment(node_id, draggable_element_id) {
    form_selector = 'form#'.concat(draggable_element_id);
    $('form.my-form-control').addClass('d-none');
    cloned_form = $(form_selector).clone(true, true);
    cloned_form.attr({
        'id': node_id
    });
    cloned_form.removeClass('d-none');
    $('.right_toolbox').append(cloned_form);
}


// make formData form each form by its  fields
function make_formData(form_id, fields) {
    let formData = new FormData();
    $.each(fields, function(name, value) {
        formData.append(name, get_node_info_field(form_id, value));
    });
    return formData;
}

/* ----------------------- */


// functio for getting specific data form node parameters or node meta data
function get_node_info_field(form_id, field) {
    let field_selector = '';
    let field_value = '';
    let form_selector = 'form#'.concat(form_id);
    let p_selector = '';

    if (field == 'file_name') {

        p_selector = ' .meta-data p.source_collection';

    } else if (field == 'language') {

        field_selector = form_selector + ' select#inputState';
        field_value = $(field_selector).find(":selected").text();
        return field_value;

    } else if (field == 'splitter') {

        field_selector = form_selector + ' select#inputState';
        field_value = $(field_selector).find(":selected").text();
        field_value = ' ';
        return field_value;

    } else if (field == 'output_format') {

        field_selector = form_selector + ' select#inputState';
        field_value = $(field_selector).find(":selected").text();
        return field_value;

    } else if (field == 'source_node') {
        p_selector = ' .meta-data p.source_node';

    } else if (field == 'source_address') {
        p_selector = ' .meta-data p.source_address';
    }

    field_selector = form_selector + p_selector;
    field_value = $(field_selector).text()
    return field_value;
}


function get_target_nodes(source_node_id) {
    let target_nodes = [];
    //  var conn = instance.getConnections({
    //      source: source_node_id,
    //  });
    //  alert(conn.source);
    var connected = instance.getConnections();
    //   var conn = instance.select({ source: form_id });
    //   alert(conn[0]);
    //  alert(connected[0].source.id);
    $.each(connected, function(e, s) {
        //connection repaint
        //  s.repaint();
        if (s.source.id == source_node_id) {
            target_nodes.push(s.target.id);
        }
        //  alert(s.source.id);
    });
    return target_nodes;
}

// update all connected nodes (meta data)
function update_connected_node(form_id) {
    target_nodes = get_target_nodes(form_id);
    source_id = form_id;
    source_node = source_id.split('-')[0];
    source_unique_id = source_id.replace(source_node + '-', '');
    source_collection = get_node_info_field(form_id, 'file_name');
    source_address = get_node_info_field(form_id, 'source_address');

    $.each(target_nodes, function(index, value) {
        target_form_selector = 'form#'.concat(value);
        update_meta_data(target_form_selector, source_collection, source_node, source_unique_id, source_address, StateColor.Ready, '');
        update_controll_color(value, StateColor.Ready);

    });
}

// send ajax request to api
function send_request(formData, url, form_id, form_class) {
    form_selector = 'form#'.concat(form_id);
    let source_address = '';

    $.ajax({
        url: url,
        data: formData,
        type: 'POST',
        contentType: false,
        processData: false
    }).done(function(res) {
        table_selector = 'table#'.concat(form_id) + ' tbody';
        $(table_selector).children().remove();
        $.each(res, function(index, value) {
            if (index > 0) {
                if (form_class == 'import_collection') {
                    $(table_selector).append('<tr>' + '<th scope = "row" class="col-1">' + index + '</th>' + '<td class="col-4">' + value.name + '</td>' + '<td class="col-4">' + value.text + '</td>' + '<td class="col-3">' + String(Math.round(Number(value.size) / 1000)) + '</td>' + '</tr>');

                } else if (form_class == 'tokenization') {
                    $(table_selector).append('<tr>' + '<th scope = "row" class="col-1">' + index + '</th>' + '<td class="col-3">' + value.doc_name + '</td>' + '<td class="col-6">' + value.tokens + '</td>' + '<td class="col-2">' + value.tokens_count + '</td>' + '</tr>');

                } else if (form_class == 'stopword_removal') {
                    $(table_selector).append('<tr>' + '<th scope = "row" class="col-1">' + index + '</th>' + '<td class="col-3">' + value.doc_name + '</td>' + '<td class="col-6">' + value.top_10_removed_words + '</td>' + '<td class="col-2">' + value.removed_count + '</td>' + '</tr>');

                } else if (form_class == 'doc_statistics') {
                    $(table_selector).append('<tr>' + '<th scope = "row" class="col-1">' + index + '</th>' + '<td class="col-3">' + value.doc_name + '</td>' + '<td class="col-2">' + value.total + '</td>' + '<td class="col-2">' + value.distinct + '</td>' + '<td class="col-2">' + value.stop + '</td>' + '<td class="col-2">' + value.main + '</td>' + '</tr>');

                } else if (form_class == 'stemming') {
                    $(table_selector).append('<tr>' + '<th scope = "row" class="col-1">' + index + '</th>' + '<td class="col-3">' + value.doc_name + '</td>' + '<td class="col-6">' + value.top_stemmed + '</td>' + '<td class="col-2">' + value.stemmed_count + '</td>' + '</tr>');

                }
            } else {

                source_address = value.file_name;
                if (typeof(value.output_path) != 'undefined') {
                    source_address = value.output_path;
                }
                if (form_class == 'import_collection') {
                    source_address = value.file_name;
                }
                update_meta_data(form_selector, value.file_name, 'default', 'default', source_address, 'default', '');
            }

        });

        update_controll_color(form_id, StateColor.Completed);
        update_meta_data(form_selector, 'default', 'default', 'default', source_address, StateColor.Completed, '');
        update_connected_node(form_id);

    }).fail(function(res) {
        // $(state_selector).text('Failed');
        // $(state_selector).removeClass("text-success text-warning text-info text-secondary");
        // $(state_selector).addClass('text-danger');
        update_controll_color(form_id, StateColor.Failed);
        update_meta_data(form_selector, 'default', 'default', 'default', 'default', StateColor.Failed, '');

    });
}


// function that runs when click on node run button (expect of import and export)
function basic_running(form_id, form_class) {

    fields = APIs[form_class].fields;
    url = host + APIs[form_class].url;
    formData = make_formData(form_id, fields);
    send_request(formData, url, form_id, form_class);
}


/*-----------------------  Actions  ------------------------- */

instance.bind("connection", function(info) {

    //  source selector
    source_id = info.source.id;
    source_node = source_id.split('-')[0];
    source_unique_id = source_id.replace(source_node + '-', '');
    source_form_selector = 'form#'.concat(source_id);;

    source_collection = get_node_info_field(source_id, 'file_name');
    source_state_selector = source_form_selector.concat(' .meta-data p.state');

    source_address = get_node_info_field(source_id, 'source_address');

    //  target selector
    target_id = info.target.id;
    target_node = target_id.split('-')[0];
    target_form_selector = 'form#'.concat(target_id);




    if ($(source_state_selector).text() == 'Completed') {
        update_meta_data(target_form_selector, source_collection, source_node, source_unique_id, source_address, StateColor.Ready, '');
        update_controll_color(target_id, StateColor.Ready);
    }


    if (!check_connection(source_node, target_node)) {
        var endpoints = instance.getEndpoints(target_id);
        endpoint = endpoints[0];
        //  endpoints[0].setPaintStyle({
        //      color: "red",
        //  });


        info.connection.setPaintStyle({
            stroke: "#d9534f",
            strokeWidth: 4,
        });
        info.connection.setHoverPaintStyle({
            stroke: "#d9534f",
            strokeWidth: 4,
        });
        setTimeout(function() {
            instance.deleteConnection(info.connection);
        }, 250);
    } else {
        //  var endpoints = instance.getEndpoints(target_id);
        //  endpoint = endpoints[0];
        //  endpoint.connectionType = 'green-connection';
        //  alert(endpoint.connectionType);
        //  instance.repaint(endpoint.id);
        //  setTimeout(function() {
        //      info.connection.setPaintStyle({
        //          stroke: "green",
        //      });
        //      info.connection.setHoverPaintStyle({
        //          stroke: "green",
        //      });
        //  }, 500);
        //  instance.repaint(info.connection);

    }
    //  instance.selectEndpoints({ source: element }).each(function (endpoint) {
    //     endpoint.connectorStyle.dashstyle = "2 4";
    //     instance.repaint(element);
    // });

});

instance.bind("connectionDetached", function(info) {
    //  source selector
    //  target selector
    target_id = info.target.id;
    target_form_selector = 'form#'.concat(target_id);

    update_meta_data(target_form_selector, '', '', '', StateColor.Created, '');
    update_controll_color(target_id, StateColor.Created);

});

instance.bind("zoom", function(newValue) {
    alert('zoom');
});

instance.bind("ready", function() {

    // define connection type
    instance.registerConnectionTypes({
        "gray-connection": {
            paintStyle: {
                stroke: "gray",
                strokeWidth: 2,
                // reattach: true,
                // outlineWidth: 0.5,
                // outlineStroke: 'yellow',
                // dashstyle: '2 1'
            },
            hoverPaintStyle: {
                stroke: "gray",
                strokeWidth: 8
            },
            connector: "Bezier"
        },
        "red-connection": {
            paintStyle: {
                stroke: "red",
                strokeWidth: 2,
                // reattach: true,
                // outlineWidth: 0.5,
                // outlineStroke: 'yellow',
                // dashstyle: '2 1'
            },
            hoverPaintStyle: {
                stroke: "red",
                strokeWidth: 8
            },
            connector: "Bezier"
        },

        "green-connection": {
            paintStyle: {
                stroke: "red",
                strokeWidth: 2,
                // reattach: true,
                // outlineWidth: 0.5,
                // outlineStroke: 'yellow',
                // dashstyle: '2 1'
            },
            hoverPaintStyle: {
                stroke: "red",
                strokeWidth: 8
            },
            connector: "Bezier"
        }

    });
    // instance.draggable("control1", {
    //     "containment": true
    // });
    // instance.draggable("control2", {
    //     "containment": true
    // })
    // instance.addEndpoint("control1", {
    //     endpoint: "Dot", // rectangle, blank, image
    //     anchor: ["RightMiddle"],
    //     isSource: true,
    //     connectionType: "red-connection",
    //     maxConnections: 10
    // });
    // instance.addEndpoint("control2", {
    //     endpoint: "Dot",
    //     anchor: ["LeftMiddle"],
    //     isTarget: true,
    //     connectionType: "red-connection",
    //     maxConnections: 10
    // });

    // https://stackoverflow.com/a/4502207

    /* --------delete connection button-------------- */
    instance.bind("contextmenu", function(component, event) {
        if (component.hasClass("jtk-connector")) {
            event.preventDefault();
            window.selectedConnection = component;
            $("<div class='custom-menu'><button class='delete-connection'>Delete connection</button></div>")
                .appendTo("body")
                .css({
                    top: event.pageY + "px",
                    left: event.pageX + "px"
                });
        }
    });

    $("body").on("click", ".delete-connection", function(event) {
        instance.deleteConnection(window.selectedConnection);
    });

    $(document).bind("click", function(event) {
        $("div.custom-menu").remove();
    });
    /* --------#########################-------------- */

    /* --------delete controll button-------------- */
    $("body").on("contextmenu", "#workspace .control", function(event) {
        event.preventDefault();
        delete_count = $('.delete-control').length
        if (delete_count == 0) {
            window.selectedControl = $(this).attr("id");
            $("<div class='custom-menu'><button class='delete-control'>Delete control</button>")
                // $("<div class='custom-menu'><button class='delete-control'>Delete control</button><button class='run-control'>Run</button></div>")
                .appendTo("body")
                .css({
                    top: event.pageY + "px",
                    left: event.pageX + "px",
                    // background: 'red',
                });

        }

    });

    $("body").on("click", ".delete-control", function(event) {
        node_id = (window.selectedControl);
        //  alert(node_id);
        // remove node info form and preview table
        form_selector = 'form#'.concat(node_id);
        $(form_selector).remove();
        table_selector = 'table#'.concat(node_id);
        $(table_selector).remove();
        instance.remove(window.selectedControl);

    });
    /* --------#########################-------------- */

    $("#toolbox .control").draggable({
        helper: "clone",
        containment: "body",
        appendTo: "#workspace"
    });
    /* ---------workspace droppable actions-------------------- */


    $("#workspace").droppable({
        drop: function(event, ui) {

            /*------ make a copy of dragged node and append it to the workspace -----------*/
            var unique_id = uuidv4();
            var clone = $(ui.helper).clone(true);
            var draggable_element_id = ui.draggable.prop('id');
            var node_id = draggable_element_id.concat(('-' + unique_id));
            clone.attr("id", node_id);
            clone.attr('name', draggable_element_id);
            clone.appendTo(this);
            instance.draggable(node_id, {
                containment: true
            });
            /* --------#########################--------- */

            // var s = $('._jsPlumb_endpoint:first').data()
            // alert(s);

            /*------ setting endpoint of each dropped node -----------*/
            if (draggable_element_id.includes('Import')) {
                instance.addEndpoint(node_id, {
                    endpoint: "Dot",
                    anchor: ["RightMiddle"],
                    isSource: true,
                    connectionType: "gray-connection",
                    maxConnections: 10
                });
            } else if (draggable_element_id.includes('Export')) {
                instance.addEndpoint(node_id, {
                    endpoint: "Dot",
                    anchor: ["LeftMiddle"],
                    isTarget: true,
                    connectionType: "gray-connection",
                    maxConnections: 1
                });
            } else {
                instance.addEndpoint(node_id, {
                    endpoint: "Dot",
                    anchor: ["LeftMiddle"],
                    isTarget: true,
                    connectionType: "gray-connection",
                    maxConnections: 1

                });
                instance.addEndpoint(node_id, {
                    endpoint: "Dot",
                    anchor: ["RightMiddle"],
                    isSource: true,
                    connectionType: "gray-connection",
                    maxConnections: 10
                });
            }

            /* --------#########################--------- */

            // Create Info Segment
            create_node_info_segment(node_id, draggable_element_id);

            // Create preview selection
            create_preview_segment(node_id, draggable_element_id);
            $('#workspace .control').css({ 'box-shadow': '', 'border-width': '2px' });
            $(clone).css({ 'box-shadow': '0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)', 'border-width': '4px' });
            /* --------#########################--------- */

            // table_selector = 'table#'.concat(draggable_element_id);
            // $(table_selector).removeClass('d-none');

            // jsPlumb.removeAllEndpoints("import");
            // var endpoints = plumbInstance.getEndpoints(id);
            // alert(endpoints);
            // jsPlumb.deleteEndpoint(endpoint[0]);

        }
    })


    // update preview & node info segment when click on a node in workspace
    $("body").on("click", "#workspace .control", function(event) {

        node_name = $(this).attr('name');
        node_id = $(this).attr('id');
        // alert(node_id);
        update_info_preview_segment(node_id);
        $('#workspace .control').css({ 'box-shadow': '', 'border-width': '2px' });
        $(this).css({ 'box-shadow': '0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)', 'border-width': '4px' });
        //  $(this).addClass('font-italic');

    });

    /* --------############    Run Controller      #############--------- */

    /*-----------------------  Runnig Segment  -------------------------*/

    // import collection run
    $('form.import_collection button').click(function() {

        // chceck duplicate connection at binding
        //  var con = info.connection;
        //  var arr = jsPlumb.select({ source: con.sourceId, target: con.targetId });
        //  if (arr.length > 1) {
        //      jsPlumb.detach(con);
        //  }


        form_id = $(this).closest('form').attr('id');
        file_uploader_selector = '#' + form_id.concat(' #FilUploader');
        file_uploader = $(file_uploader_selector)[0];



        //  var connected = instance.getConnections();
        //  var conn = jsPlumb.select({ source: form_id });
        //  alert(conn[0].id);
        //  //  alert(connected[0].source.id);
        //  $.each(connected, function(e, s) {
        //      //connection repaint
        //      s.repaint();

        //      //  alert(s.source.id);
        //      //  alert(s.target.id);
        //  });

        var numFiles = file_uploader.files ? file_uploader.files.length : 1;
        if (numFiles < 1) {
            alert('Import a collection!');
        } else {
            text_input_selector = '#' + form_id.concat(' #text-input');
            var formData = new FormData();
            file_name = $(text_input_selector).val();


            source_form_selector = 'form#'.concat(form_id);;
            source_collection_selector = source_form_selector.concat(' .meta-data p.source_collection');
            //  alert($(source_form_selector).attr('id'));

            $(source_collection_selector).text(file_name);
            formData.append('name', file_name); //این فیلد را می توانی حذف کنی
            formData.append('file', file_uploader.files[0]);
            url = host + 'api/import/';
            // alert(file_uploader[0].files[0]);
            send_request(formData, url, form_id, 'import_collection');
        }

    });


    // tokenization Run
    $('form.tokenization button').click(function() {

        form_id = $(this).closest('form').attr('id');
        form_class = $(this).closest('form').attr('class').split(' ').pop();;
        basic_running(form_id, form_class);
    });

    // stw_run Run
    $('form.stopword_removal button').click(function() {
        form_id = $(this).closest('form').attr('id');
        form_class = $(this).closest('form').attr('class').split(' ').pop();;
        basic_running(form_id, form_class);
    });

    // doc_statistics Run
    $('form.doc_statistics button').click(function() {
        form_id = $(this).closest('form').attr('id');
        form_class = $(this).closest('form').attr('class').split(' ').pop();;
        basic_running(form_id, form_class);

    });

    // stemming Run
    $('form.stemming button').click(function() {
        form_id = $(this).closest('form').attr('id');
        form_class = $(this).closest('form').attr('class').split(' ').pop();;
        basic_running(form_id, form_class);

    });



    function correct_address_node_names(address) {
        return address.replace('media/result/', '').replace('stop_word', 'stopword_removed').replace('/', '_').concat('_output');
    }

    function download_file(url, form_id, sequence_address) {
        source_collection_selector = 'form#'.concat(form_id) + ' .meta-data p.source_collection';
        source_node_selector = 'form#'.concat(form_id) + ' .meta-data p.source_node';
        file_name = $(source_collection_selector).text();
        source_node = $(source_node_selector).text();
        form_selector = 'form#'.concat(form_id);
        // file_name = $('#text-input').val();
        file_name_wo_extention = file_name.split('.').slice(0, -1).join('.')
        state_selector = 'form#'.concat(form_id) + ' .meta-data p.state';

        $.ajax({
            url: url,
            method: 'GET',
            xhrFields: {
                responseType: 'blob',

            },
            success: function(data) {
                format_selector = 'form#'.concat(form_id) + ' #export_data_output_format';
                var output_format = $(format_selector).find(":selected").text();
                var output_node = correct_address_node_names(sequence_address);
                output_node = output_node.replace(file_name, '');
                var a = document.createElement('a');
                var url = window.URL.createObjectURL(data);
                a.href = url;
                a.download = file_name_wo_extention + '_' + output_node + output_format;
                document.body.append(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                $(state_selector).text('Completed');
                update_controll_color(form_id, StateColor.Completed);
                update_meta_data(form_selector, 'default', 'default', 'default', 'default', StateColor.Completed, '');
            }

        }).fail(function(res) {
            // $(state_selector).text('Failed');
            // $(state_selector).addClass('text-danger');
            update_controll_color(form_id, StateColor.Failed);
            update_meta_data(form_selector, 'default', 'default', 'default', 'default', StateColor.Failed, '');


        });
    }
    // export Run
    $('form.export_file button').click(function() {

        // alert(instance.getConnections()[0]);

        form_id = $(this).closest('form').attr('id');
        form_selector = 'form#'.concat(form_id);

        file_name = get_node_info_field(form_id, 'file_name');
        source_node = get_node_info_field(form_id, 'source_node');
        source_address = get_node_info_field(form_id, 'source_address');
        output_format = get_node_info_field(form_id, 'output_format');
        var formData = new FormData();
        // file_name = $('#text-input').val();
        //  file_name_wo_extention = file_name.split('.').slice(0, -1).join('.')
        //  state_selector = 'form#'.concat(form_id) + ' .meta-data p.state';

        formData.append('name', file_name);
        formData.append('from', source_address);
        formData.append('format', output_format);
        // alert($('#FilUploader')[0].files[0]);
        $.ajax({
            //  url: "https://localhost:8000/api/export/",
            url: host + export_file_api.url,
            data: formData,
            type: 'POST',
            contentType: false,
            processData: false,
        }).done(function(res) {
            file_src = host + res;
            download_file(file_src, form_id, source_address);

        }).fail(function(res) {
            update_controll_color(form_id, StateColor.Failed);
            update_meta_data(form_selector, 'default', 'default', 'default', 'default', StateColor.Failed, '');
        });
    });



});