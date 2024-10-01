//   Script:     scheduled_archiveSalesOrders.js
//   
//   Created by: Eric Abramo
//
//   Description:	Script runs saved search
//   			1) Sales Orders with Fiscal Date prior to FY13 - archive data
//    			It iterates through the internal ID's of the results of the search and deletes the record
//				This script also re-schedules itself to run when the governance units get low
//   
//   Functions: 	search_and_delete_salesorders
//
//	 Parameters: 	custscript_salesorder_search_id
//					stores the ID of the Saved Search used to generate the deletions
//
//    Revisions: 
//    06-13-2017	Eric Abramo	Created Script File
//
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Flag to use if low on NetSuite Governance Usage Units
var lowUsage = false;

function search_and_delete_salesorders()
{
	var salesorder_searchid = nlapiGetContext().getSetting('SCRIPT', 'custscript_salesorder_search_id');
	nlapiLogExecution('DEBUG', 'Start of function', 'Search ID parameter is: '+salesorder_searchid);	

	// custscript_salesorder_search_id is a parameter in the SCRIPT Record storing the Search ID
	var search = nlapiLoadSearch('salesorder', salesorder_searchid);
	var searchResults = search.runSearch();
	// Counter Variables to Control the Result Sets
	var resultIndex = 0; 
	var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
	var resultSet; // temporary variable used to store the result set
	do 
	{
	    // fetch one result set
	    resultSet = searchResults.getResults(resultIndex, resultIndex + resultStep);	
	    // increase pointer
	    resultIndex = resultIndex + resultStep;

	    // process or log the results
	    // nlapiLogExecution('DEBUG', 'resultSet returned', resultSet.length +' records returned');		
		if (resultSet.length == 0)
		{
			return; // close out function if no results
		}		
		// If results then Loop (added lowUsage parameter to ensure don't go over usage limit)
		var err_counter = 0;
		var success_counter = 0;
		for (var i = 0; i < resultSet.length && lowUsage == false; i++)
		{
			// nlapiLogExecution('DEBUG', 'Get Remaining Usage', 'Remaining Usage is: '+nlapiGetContext().getRemainingUsage());
			if (nlapiGetContext().getRemainingUsage() >= 100 )
			{			
				var so_searchresult = resultSet[i];
				var x = so_searchresult.getAllColumns(); 	
				var soId = so_searchresult.getValue(x[0]);
				// nlapiLogExecution('DEBUG', 'Sales Order to be deleted:', 'soId= '+soId);		
				try 
				{
					var salesorder = nlapiLoadRecord('salesorder', soId);
					nlapiSubmitRecord(salesorder, true, true);
					//Delete Sales Order
					nlapiDeleteRecord('salesorder', soId);
					success_counter = success_counter + 1;
				}
				catch ( e )
				{
					err_counter = err_counter + 1;
					//nlapiLogExecution('debug', '*** within CATCH ERROR ***'); 
					if ( e instanceof nlobjError ) 
					{				
						if (e.getCode() == 'RCRD_DSNT_EXIST') {
							//errReason = 'NS Record does NOT exist';
							status = 'SKIPPED';					
							nlapiLogExecution('DEBUG', 'STATUS - SKIPPED', e.getCode() + ': ' + e.getDetails());
						}
						else {
							//errReason = 'NS Saved Search SYSTEM ERROR for SSId='+inSSId+':  ' + e.getCode() + '\n' + e.getDetails();
							status = 'ERROR';					
							nlapiLogExecution('DEBUG', '*** ERROR ***', e.getCode() + ': ' + e.getDetails());
						}		
					}		
					else {		
						status = 'ERROR';			
						nlapiLogExecution('DEBUG', '*** ERROR ***', e.getCode() + ' for record : ' +soId);
					}		
				}				
			}
			else
			{	// Flag if low on NetSuite Governance Usage Units
				lowUsage = true;
			}
		}	
		nlapiLogExecution('DEBUG', 'Finished search_and_delete_salesorder', 'Deleted Record Count = '+success_counter+'. Error Count = '+err_counter);
	// once no records are returned we already got all of them
	}while (resultSet.length > 0 && lowUsage == false)
		
	//RESCHEDULING THE SCRIPT	            
	if (lowUsage == true)
	{
		nlapiLogExecution('DEBUG', 'Usage About to Be Exceeded', 'ReScheduling Script');
		// var status = nlapiScheduleScript('customscript_scheduled_delete_salesorder', 'customdeploy_scheduled_delete_salesorder');
		var context = nlapiGetContext();
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());	
		// nlapiLogExecution('DEBUG', 'scheduled Script status', 'status is '+status);	
	}
	else
	{
		nlapiLogExecution('DEBUG', 'scheduled Script status', 'No need to re-schedule the script');
	}
}



