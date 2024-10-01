// Amendment log - created 01-21-2015
// EAbramo		01-21-2015		On save: If Status = Closed then Require "Level of Effort" field
// EAbramo		02/19/2015		renamed CaseForm4.js script to caseFormDiscovery.js
//						This script should only be used for the two case forms DS Coordinator and DS Case form
//						Added code to set new Discovery Case field to true
// 						purpose is to NOT display the EIS Account Selector field using this parameter on beforeLoad script
//						Need to split out User Services Case form to use separate script - because HelpDesk flag shouldn't be true
//JeffO			9/13/2016	Created copy of DS Coordinator Case Form to be applied to the DS Case form only.  Anything relating to the DS Coordinator Case Form below can be removed.
//E Abramo		01/02/2019		US463372 Add SF fields to DS Case form - allow for Sync


var company_id = null;
var company_status = null;
var eis_account = null;
var eis_acct_status = null;
var showMessage = false;

function epCaseLoad(type)
{
	// if this is a new case
	if ( (nlapiGetFieldValue('id') == "") || (nlapiGetFieldValue('id') == null) )
	{
		//set assigned rep to current user
		nlapiSetFieldValue('assigned', nlapiGetUser());
		// enable the EIS Account field
		nlapiDisableField('custevent_eis_account', false);
		// If new case check call getCurrentCompanyAccount function
		// this looks up Company and EIS Fields and calls function to perform searching and load appropriately
		getCurrentCompanyAccount(showMessage);
	}
	else
	{	// if not new case check if it's an EIS Case -
		// if so then go to the getcurrentCompanyAccount function
		if (nlapiGetFieldValue('custevent_eis_case_flag') == 'T')
		{
			// call the getCurrentCompanyAccount function
			getCurrentCompanyAccount(showMessage);
			// enable the EIS Account field
			nlapiDisableField('custevent_eis_account', false);
		}
	}

	// Set Origin
	var currentOrigin = nlapiGetFieldText('origin');
	if (currentOrigin == null || currentOrigin == "")
	{
	      nlapiSetFieldText('Origin', 'Phone');
	}
	
	// US463372 Add SF fields to DS Case form - allow for Sync
	// Enable "SF Hide Case From CXP" flag if Case DOES have a SF ID (note: this field has field level permissions).
	if (nlapiGetFieldValue('custevent_sf_case_id'))
	{
		nlapiDisableField('custevent_hide_case_cxp', false);
	}
	else
	{
		nlapiDisableField('custevent_hide_case_cxp', true);
	}
}


function getCurrentCompanyAccount(showMessage)
{
	// Onload get Company and EIS Account variables
	company_id = nlapiGetFieldValue('company');
	eis_account = nlapiGetFieldValue('custevent_eis_account');

	// Set Company Status -- anonymous customer is 277026
	if (company_id != '' && company_id != null && company_id != '277026')
	{
		company_status = 'Known';
	}
	else
	{
		company_status = 'Unknown';
	}
	// Set EIS Account Status
	if (eis_account == '' || eis_account == null)
	{
		eis_acct_status = 'Unknown';
	}
	else
	{
		eis_acct_status = 'Known';
	}
	//Call the Get_EIS_Accounts function to populate the EIS Account Selector list
	//or the Company Selector List
	if (company_status == 'Known' && eis_acct_status == 'Unknown')
	{
		get_EIS_Accounts(showMessage);
	}

	if (company_status == 'Unknown' && eis_acct_status == 'Known')
	{
		get_Company(showMessage);
	}
//	if (company_status == 'Known' && eis_acct_status == 'Known')
//	{
//		alert('no need to get anything - both fields are known');
//	}
}



function caseFormSave()
{
	var Issue = nlapiGetFieldValue('issue');
	var LinkingIssue = nlapiGetFieldValue('custevent_linkingissue');

	// if Product is populated and is EIS Product - then set EIS Flag to true
	// -- killed this code prior to deployment of EIS case
	//if (nlapiGetFieldValue('custevent_itemproduct') != '' && nlapiGetFieldValue('custevent_itemproduct') != null)
	//{
	//	var caseitem = nlapiGetFieldValue('custevent_itemproduct');
	//	if (nlapiLookupField('item', caseitem, 'custitem_is_eis_product', null) == 'T')
	//	{
	//		nlapiSetFieldValue('custevent_eis_case_flag', 'T');
	//	}
	//}

	//check to see if user selected Linking Services as case issue
	//check to see if user filled in Linking Issues field
	if (Issue == "10" && LinkingIssue  == "")
	{
		//if empty, tell them they have to fill it in, otherwise return to save case
		alert('Please fill in the Linking Issues field before saving the case.');
		return false;
	}

	// Require Interface if a Product is selected (as long as product is not "N/A" (255))
	var case_product = nlapiGetFieldValue('custevent_itemproduct');
	var case_interface = nlapiGetFieldValue('custevent_interface');
	if ( case_product != "" && case_product != null && case_product != '255' && (case_interface == "" || case_interface == null))
	{
		alert('Interface is required if a Product is selected.  Select an Interface');
		return false;
	}


	// 2015-01-20 If Closed then Require "Level of Effort"
//	if (nlapiGetFieldValue('status') == 5)
//	{	//  ensure Level of Effort
//		if (nlapiGetFieldValue('custevent_level_of_effort') == '' || nlapiGetFieldValue('custevent_level_of_effort') == null)
//		{
//			alert('Level of Effort is required for all Closed Cases');
//			return false;
//		}
//	}


	// 2015 set Discovery Case flag if it's not populated
	if (nlapiGetFieldValue('custevent_discovery_case')=='' || nlapiGetFieldValue('custevent_discovery_case')==null || nlapiGetFieldValue('custevent_discovery_case')=='F')
	{
		nlapiSetFieldValue('custevent_discovery_case', 'T');
	}



	// Validate that EIS Account matches to Company
	// Verify that company is populated
	company_id = nlapiGetFieldValue('company');
	eis_account = nlapiGetFieldValue('custevent_eis_account');
	if (company_id == '' || company_id == null)
	{
		alert('Company is required');
		return false;
	}
	// Verify that all EIS Cases have an EIS Account -- as long as the EBSCONET setup flag is not checked
	if(nlapiGetFieldValue('custevent_eis_case_flag') == 'T' && nlapiGetFieldValue('custevent_ebsconet_setup_request') == 'F' && (eis_account=='' || eis_account==null))
	{
		alert('This case is flagged as an EIS Case.  Please select an EIS Account');
		return false;
	}

	if (eis_account != '' || eis_account != null)
	{	// set a verification variable to false
		var eischeck = false;
		// build my search
		var eischeck_filters = new Array();
		eischeck_filters[0] = new nlobjSearchFilter('custrecord_eis_account_customer', null, 'is', company_id);
		var eischeck_columns = new Array();
		eischeck_columns[0] = new nlobjSearchColumn('internalid', null, null);
		// run my search
		eischeck_searchResults = nlapiSearchRecord('customrecord_eis_account', null, eischeck_filters, eischeck_columns);
		// loop through results setting verification variable to true if search results match to the EIS Account
		for(var i = 0; eischeck_searchResults != null && i < eischeck_searchResults.length; i++)
		{
			var temp = eischeck_searchResults[i].getId();
			if (temp = eis_account)
			{
				eischeck = true;
			}
		}
		if (eischeck == 'false')
		{
			alert('Your selected EIS Account does not match your selected Company.  Please re-select either the Company or EIS Account so that they match');
			return false;
		}
	}
	return true;
}

// 04-14-2006
// copies message text from original to outgoing boxes
var originalMessageCopied = false;
function copyOriginalMessage()
{
	if (originalMessageCopied == false)
	{
		nlapiSetFieldValue('outgoingmessage',nlapiGetFieldValue('outgoingmessage') + '\n\n--- Original Message ---\n' + nlapiGetFieldValue('incomingmessage'));
		originalMessageCopied = true;
	}
}


function caseFieldChange(type, name)
{
	if (name == 'custevent_eis_case_flag')
	{
		//alert('You changed the EIS Case flag');
		if (nlapiGetFieldValue('custevent_eis_case_flag') == 'T')
		{
			// call the getCurrentCompanyAccount function
			getCurrentCompanyAccount(showMessage);
			// enable the EIS Account field
			nlapiDisableField('custevent_eis_account', false);
		}
	}

	// set the EIS Case flag in the save if product designates it
	if (name == 'custevent_itemproduct')
	{
		if (nlapiGetFieldValue('custevent_itemproduct') != '' && nlapiGetFieldValue('custevent_itemproduct') != null)
		{
			var caseitem = nlapiGetFieldValue('custevent_itemproduct');
			nlapiSetFieldValue('custevent_eis_case_flag', nlapiLookupField('item', caseitem, 'custitem_is_eis_product', null));
		}
	}

	if (name == 'company')
	{
		// If this is an EIS Case and the Company changes then go through the lookup process
		// Clear the EIS Account Field
			nlapiSetFieldValue('custevent_eis_account', '', false, true);
			// set the showMessage parameter as true
			if (nlapiGetFieldValue('custevent_eis_case_flag') == 'T')
			{
				showMessage = true;
			}
			//call the getCurrentCompanyAccount function to check what needs to be searched
			getCurrentCompanyAccount(showMessage);
	}

	if (name == 'custevent_eis_account')
	{
		// If this is an EIS Case and the EIS Account changes then go through the lookup process
			// Clear the Company Field
			nlapiSetFieldValue('company', '', false, true);
			// set the showMessage parameter as true
			if (nlapiGetFieldValue('custevent_eis_case_flag') == 'T')
			{
				showMessage = true;
			}
			//call the getCurrentCompanyAccount function to check what needs to be searched
			getCurrentCompanyAccount(showMessage);
	}

	// set the EIS Account based on the EIS Account Selector selection -- NOTE THAT FIELD CHANGE FIRE IS FALSE
	if (name=='custpage_eis_account_selector')
	{
		nlapiDisableField('custevent_eis_account', false);
		nlapiSetFieldText('custevent_eis_account', nlapiGetFieldText('custpage_eis_account_selector'), false, true);
		nlapiRemoveSelectOption('custpage_eis_account_selector');
	}
	//set the Company based on the Company Selector selection. NOTE THAT FIELD CHANGE FIRE IS FALSE
	if (name=='custpage_customer_selector')
	{
		nlapiDisableField('company', false);
		nlapiSetFieldText('company', nlapiGetFieldText('custpage_customer_selector'), false, true);
		// don't disable the company field
		//nlapiDisableField('company', true);
		nlapiRemoveSelectOption('custpage_customer_selector');
	}
}


function get_EIS_Accounts(showMessage)
{
	// this function is called if company_status is Known && eis_acct_status is Unknown
	// Search EIS Accounts connected to Customers with this Case's Company
	var eis_filters = new Array();
	eis_filters[0] = new nlobjSearchFilter('custrecord_eis_account_customer', null, 'is', company_id);
	eis_filters[1] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	var eis_columns = new Array();
	eis_columns[0] = new nlobjSearchColumn('name', null, null);
	eis_searchResults = nlapiSearchRecord('customrecord_eis_account', null, eis_filters, eis_columns);
	if (eis_searchResults != null)
	{
		if (eis_searchResults.length == 1)
		{
			// if just one result then populate the eis account field
			nlapiSetFieldText('custevent_eis_account', eis_searchResults[0].getValue('name'), false, true);
			//if (showMessage == true)
			//{
			//	alert('This Case\'s EIS Account is being set based on the Company');
			//}
		}
		else
		{
			// if more than one result then load the EIS Account Selector field and lock the EIS Account field
			// open up the EIS Selector field (and clear it - if it has values)
			nlapiDisableField('custpage_eis_account_selector', false);
			nlapiRemoveSelectOption('custpage_eis_account_selector');
			nlapiInsertSelectOption('custpage_eis_account_selector','', '', true);
			// alert('multiple eis searchresults returned');
			for(var i = 0; eis_searchResults != null && i < eis_searchResults.length; i++)
			{
				nlapiInsertSelectOption('custpage_eis_account_selector', eis_searchResults[i].getId, eis_searchResults[i].getValue('name'), false);
			}
			// disable the EIS Account field so that you can use the EIS Account selector field instead
			nlapiDisableField('custevent_eis_account', true);
			if (showMessage == true)
			{
				alert('Please use the EIS Account Selector to select an EIS Account for this Case');
			}
		}
	}
}

function get_Company(showMessage)
{
	// this function searches for all Customers connected to this Case's EIS Account
	var co_filters = new Array();
	co_filters[0] = new nlobjSearchFilter('internalid', null, 'is', eis_account);
	co_filters[1] = new nlobjSearchFilter('custrecord_eis_account_customer', null, 'noneof','@NONE@');
	var co_columns = new Array();
	co_columns[0] = new nlobjSearchColumn('custrecord_eis_account_customer', null, null);
	co_searchResults = nlapiSearchRecord('customrecord_eis_account', null, co_filters, co_columns);

	if (co_searchResults)
	{
		if(co_searchResults.length == 1)
		{
			// next line commented out 2-7-12
			// var company = nlapiLookupField('entity', co_searchResults[0].getValue('custrecord_eis_account_customer', null, null), 'entityid', null);
			// next line added on 2-7-12
			var company = co_searchResults[0].getValue('custrecord_eis_account_customer', null, null);
			// next line commented out 2-7-12
			// nlapiSetFieldText('company', company, false, true);
			// next line added on 2-7-12
			nlapiSetFieldValue('company', company, false, true);
		}
		else
		{
			alert('there are multiple Customers for this EIS Account - Contact CRM Operations');
		}
	}
}
