
$(".date").each(function (index) {
	d = new Date($(this).text());
	s = $.format.date(d, "MMM d, yyyy") + " at " + $.format.date(d, "h:mm a");
	$(this).text(s);
});

// Make the Demo Mode checkbox in the sidebar a pretty on/off slider
$(".admin-switch").bootstrapSwitch();
$(".admin-switch").on('switchChange.bootstrapSwitch', function (event, state) {
	var url = $(this).attr("id").replace(/-/g, '/');
	ajax_url = "/" + url + "/" + state;
	$.ajax({
		url: ajax_url,
		context: this,
		success: toggle_state_success,
		error: toggle_state_fail
	});
});

function toggle_state_success (data) {
	if ($(this).hasClass('require-refresh')) {
		location.reload();
	} else if ($(this).hasClass('toggle-disabled')) {
		var type = $(this).attr("id").split('-')[1];
		var id   = $(this).attr("id").split('-')[3];
		console.log($(this).prop("checked"));
		if ($(this).prop("checked")) {
			$("#"+type+"-" + id).removeClass("disabled-row");
		} else {
			$("#"+type+"-" + id).addClass("disabled-row");
		}
	}
}

function toggle_state_fail (data) {
	alert_error("Failed to save toggle state.");
}

function toggle_enabled (type, btn) {
	btn_type = btn.attr("id").split("-")[1];
	id = btn.attr("id").split("-")[3];
	row = $("#"+type+"-" + id)

	if (btn_type == "disable") {

		// Mark the row to be disabled upon submit
		row.children("#"+type+"-enabled-"+id).val("0");

		// Gray out the row to show it will be deleted
		$("#"+type+"-" + id + " input:text").attr("disabled", "disabled");

		// Hide the delete button
		btn.hide();

		// Display the undo button
		$("#btn-enable-"+type+"-" + id).show();

	} else if (btn_type == "enable") {

		// Mark the user as enabled
		row.children("#"+type+"-enabled-"+id).val("1");

		// Un-disable the boxes in the row
		$("#"+type+"-" + id + " input:text").removeAttr("disabled");

		// Hide the undo button
		btn.hide();

		// Show the delete button again
		$("#btn-disable-"+type+"-" + id).show();
	}
}

$(".edit-item-row").on("click", "button", function () {
	toggle_enabled("item", $(this));
});

$(".edit-box-row").on("click", "button", function () {
	toggle_enabled("box", $(this));
});

$(".edit-user-row").on("click", "button", function () {
	toggle_enabled("user", $(this));
});

$(".edit-vendor-row").on("click", "button", function () {
	toggle_enabled("vendor", $(this));
});

$(".edit-announcement-row").on("click", "button", function () {
	toggle_enabled("announcement", $(this));
});

// Add a new row to the add items form
$("#btn-items-add-row").click(function () {

	// Instead of counting each time, just keep the number of lines around
	// in a hidden element.
	var item_lines_count = parseInt($("#new-items-number").val());

	// Copy row 0 to create a new row
	container = $("#new-item-0").clone().attr("id", "new-item-"+item_lines_count);
	container.find("input").each(function (index) {
		// Update the ID to the next number
		id = $(this).attr("id");
		name_pieces = id.split("-");
		name_pieces[name_pieces.length-1] = item_lines_count;
		new_id = name_pieces.join("-");
		$(this).attr("id", new_id);
		$(this).attr("name", new_id);
		if ($(this).is(":checkbox")) {
			// Reset the checkmark so new products are enabled by default
			$(this).prop("checked", "checked");
		} else {
			// Clear the value if there is text in the first row already
			$(this).val("");
		}
		if (name_pieces[1] == 'barcode') {
			$(this).on("input", barcode_check_fn);
			// Since we clone the input, we need to trigger to clear its coloring
			$(this).trigger("input");
		}
	});

	// Add the new row to the page
	$("#new-items").append(container);

	// Update the number of new items to be added
	$("#new-items-number").val(item_lines_count+1);

	attach_keypad();
});

barcode_check_fn = function () {
	var validator = new Barcoder();
	console.log($(this).val());
	if ($(this).val() == '') {
		$(this).css("backgroundColor", "inherit");
	} else if (validator.validate($(this).val()).isValid) {
		$(this).css("backgroundColor", "#98FB98");
	} else {
		$(this).css("backgroundColor", "#FF9999");
	}
};

$(".barcode-check").on("input", barcode_check_fn);

$("#select-user").change(function () {
	user_id = $("#select-user option:selected").val();
	console.log(user_id);

	// Hide all current balances
	$(".current-balance").hide();

	// Show the correct current balance for this user
	$("#current-balance-"+user_id).show();

	update_new_balance();
});

$("#balance-change-amount").on("input", function () {
	update_new_balance();
});

$("#edit-items").click(function () {
	alert_clear();
});

// Update markup
$("#edit-items").on("input", "input:text",  function () {
	var id = $(this).attr("id").split("-")[2];
	var price = parseFloat($("#item-price-"+id).val());
	var wholesale = parseFloat($("#item-wholesale-"+id).val());

	var markup = (((price/wholesale) - 1.0) * 100.0).toFixed(2);
	$("#item-markup-"+id).text(markup + "%");
	$("#item-markup-"+id).attr("data-value", markup);
});

$("#restock-table tbody tr").each(function () {
	var row_id = $(this).attr("id").split("-")[1];
	restock_update_line_total(row_id);
});

$(".restock-manual").on("click", function () {
	var type = $(this).attr("id").split("-")[2];
	add_item($("#restock-manual-"+type+"-select").val());
});

$("#restock-table").on("click", "input:checkbox", function () {
	restock_update_line_total($(this).attr("id").split("-")[2]);
});

// When the per item cost changes, update the line item total
$("#restock-table").on("input", "input:text", function () {
	restock_update_line_total($(this).attr("id").split("-")[2]);
});


$(".request-delete").click(function () {
	var request_id = $(this).attr("id").split("-")[3];

	$.ajax({
		url: "/admin/request/delete/" + request_id,
		success: request_delete_success,
		error: request_delete_fail
	});
})

// filterable tables
$('.filterable').each(function (table_index) {

	var table = $(this);

	// Mark the original body as the one we are going to filter
	table.find("tbody").addClass("filtered-body");

	// Add the row of filter dropdowns
	// jquery will auto create a tbody element in the wrong place,
	// so we get in there first and do it correctly.
	var tbody = $("<tbody></tbody>");
	var tr = $('<tr class="filters"></tr>');
	table.prepend(tbody);
	tbody.append(tr);

	// Build the dropdowns
	$(this).find("th").each(function (th_index) {
		var td = $("<td></td>").appendTo(tr);
		if ($(this).hasClass("filterable-row")) {
			var select = $('<select><option value=""></option></select>')
				.appendTo(td)
				.attr("xindex", th_index+1)
				.on("change", function () {
					var val = $(this).val();
					xindex = $(this).attr("xindex");
					val = $(this).val();

					$(this).closest("table").find("tbody.filtered-body tr").show();

					$(this).closest("table").find("tr.filters td").each(function (i) {
						select = $(this).find("select");
						if (select.length > 0) {
							val = select.val();
							if (val != "") {
								$(this).closest("table").find("tbody.filtered-body tr:visible").each(function () {
									td = $(this).find("td:nth-child("+(i+1)+")");
									value = td.attr("data-value");
									if (!value) {
										value = td.text();
									}
									if (value == val) {
										$(this).show();
									} else {
										$(this).hide();
									}
								});
							}

						}
					})
				});

			var elements = [];
			table.find("tbody.filtered-body tr td:nth-child("+(th_index+1)+")").each(function () {
				value = $(this).attr("data-value");
				if (!value) {
					value = $(this).text();
				}
				if ($.inArray(value, elements) == -1) {
					elements.push(value);
					select.append('<option value="'+value+'">'+value+'</option>');
				}
			});

		}

	});
});



//
// Check for unsaved data in forms
//
var serialized_form_clean;
var clicked_submit = false;

// When the page load we get the values serialize
serialized_form_clean = $("form").serialize().split("&").sort().join("&");

// Before we leave the page we now compare between the new form values and the orignal
window.onbeforeunload = function (e) {
	console.log(serialized_form_clean);
    var serialized_form_dirty = $("form").serialize().split("&").sort().join("&");
    if (serialized_form_clean != serialized_form_dirty && !clicked_submit) {
        return "You are about to leave a page where you have not saved the data.";
    }
};

$("button:submit").click(function () {
	clicked_submit = true;
});

