var csInterface = null;
var taskID = null;
var selectedItemInfoList = null;
var transcodeEnabled = true;

function onLoaded() {	

	csInterface = new CSInterface();
	loadJSX();
    
    var appName = csInterface.hostEnvironment.appName;
    initTranscode();
    
    //updateThemeWithAppSkinInfo(csInterface.hostEnvironment.appSkinInfo);
    //Update the color of the panel when the theme color of the product changed.
	//csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, onAppThemeColorChanged);
	csInterface.addEventListener("com.adobe.host.notification.SelectedAssetInfo", refreshSelectedAsset);    
	csInterface.addEventListener("com.adobe.host.notification.TranscodeProgress", refreshProgressBar);
	csInterface.addEventListener("com.adobe.host.notification.TranscodeStatus", refreshTranscodeStatus);
    
}

/**
 * Update the theme with the AppSkinInfo retrieved from the host product.
 */
function updateThemeWithAppSkinInfo(appSkinInfo) {
    //Update the background color of the panel
    var panelBgColor = appSkinInfo.panelBackgroundColor.color;
    document.body.bgColor = toHex(panelBgColor);

    //Update the default text style with pp values    
    var styleId = "ppstyle";
    
    addRule(styleId, ".textStyle", "font-size:" + appSkinInfo.baseFontSize + "px" + "; color:" + "#" + reverseColor(panelBgColor));
    addRule(styleId, ".controlBg", "background-color:" + "#" + toHex(panelBgColor, 20));
    addRule(styleId, "button", "border-color: " + "#" + toHex(panelBgColor, -50));

}

function addRule(stylesheetId, selector, rule) {
    var stylesheet = document.getElementById(stylesheetId);
    
    if (stylesheet) {
        stylesheet = stylesheet.sheet;
           if( stylesheet.addRule ){
               stylesheet.addRule(selector, rule);
           } else if( stylesheet.insertRule ){
               stylesheet.insertRule(selector + ' { ' + rule + ' }', stylesheet.cssRules.length);
           }
    }
}


function reverseColor(color, delta) {
    return toHex({red:Math.abs(255-color.red), green:Math.abs(255-color.green), blue:Math.abs(255-color.blue)}, delta);
}

/**
 * Convert the Color object to string in hexadecimal format;
 */
function toHex(color, delta) {
    function computeValue(value, delta) {
        var computedValue = !isNaN(delta) ? value + delta : value;
        if (computedValue < 0) {
            computedValue = 0;
        } else if (computedValue > 255) {
            computedValue = 255;
        }

        computedValue = computedValue.toString(16);
        return computedValue.length == 1 ? "0" + computedValue : computedValue;
    }

    var hex = "";
    if (color) {
        with (color) {
             hex = computeValue(red, delta) + computeValue(green, delta) + computeValue(blue, delta);
        };
    }
    return hex;
}

function onAppThemeColorChanged(event) {
    // Should get a latest HostEnvironment object from application.
    var skinInfo = JSON.parse(window.__adobe_cep__.getHostEnvironment()).appSkinInfo;
    // Gets the style information such as color info from the skinInfo, 
    // and redraw all UI controls of your extension according to the style info.
    updateThemeWithAppSkinInfo(skinInfo);
} 


function refreshSelectedAsset(event) {

    if (transcodeEnabled)
    {
        $("#triggerSaveAssetResult").html("");
        var xmpContent = event.data;	
        console.log("[Response to asset selected event], received data is%s:", xmpContent);
        //xmpContent = '<hostNotification><browserID ID="MediaCollection"/><msgID ID="879a2379-fdbc-4107-86fe-5abbb4c62940"/><taskID ID="879a2379-fdbc-4107-86fe-5abbb4c62940"/><selectedItemInfoList><selectedItemInfo><filePath path="D:\Workspace\testmedia\XDCAMHD250\Clip\C0001.MXF"/><aliasName>C0001</aliasName><type>masterClip</type></selectedItemInfo></selectedItemInfoList></hostNotification>';
        //xmpContent = '<hostNotification><browserID ID="MediaCollection"/><msgID ID="8d2b5bf8-f6be-495e-aced-9a5838be3909"/><taskID ID="8d2b5bf8-f6be-495e-aced-9a5838be3909"/><selectedItemInfoList><selectedItemInfo><filePath path="D:\\Workspace\\testmedia\\XDCAMHD250\\Clip\\C0001.MXF"/><aliasName> C0001_01</aliasName><type>subClip</type><subClipInfo><startTime>00;00;26;20</startTime><duration>00;00;11;18</duration><markerID>bd648833-551d-466d-83e6-16645c37f482</markerID></subClipInfo></selectedItemInfo></selectedItemInfoList></hostNotification>';
        //xmpContent = '<?xml version="1.0" encoding="UTF-16" standalone="no" ?><hostNotification><browserID ID="MediaCollection"/><msgID ID="a0a252a9-05d4-4170-87f0-5a37eefa52fb"/><taskID ID="a0a252a9-05d4-4170-87f0-5a37eefa52fb"/><selectedItemInfoList><selectedItemInfo><filePath path="C:\\Users\\dell09\\Documents\\Adobe\\Prelude\\2.0\\Rough Cuts\\Untitled Rough Cut_29.arcut"/><aliasName>Untitled Rough Cut_29</aliasName><type>roughCut</type></selectedItemInfo></selectedItemInfoList></hostNotification>';
        var xmlDoc = getXMLDoc(xmpContent);
        if (xmlDoc != null)
        {
            parseSelectedAsset(xmlDoc);
    
            if (selectedItemInfoList.length != 1)
            {
                taskID = null;
            }
            else
            {
                var mediaPath = selectedItemInfoList[0].getElementsByTagName('filePath')[0].attributes['path'].value;
                $("#sourcePath").val(mediaPath);
                          
                // Enable the button to save asset       
            }
        }
        else
        {
            console.log("[can not parse ]");
        }
    }
    else
    {
        console.log("[Response to asset selected event is disabled]"); 
        
    }
}

function getXMLDoc(xmlText)
{
	var xmlDoc = null;

	try //Internet Explorer
	{
		xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
		xmlDoc.async="false";
		xmlDoc.loadXML(xmlText);
	}
	catch(e)
	{
		try //Firefox, Mozilla, Opera, etc.
		{
			parser=new DOMParser();
			xmlDoc=parser.parseFromString(xmlText,"text/xml");
		}
		catch(e) {
			console.log("[Error occurred when create a xml object for a string]");
		}
	}

	return xmlDoc;
}

function parseSelectedAsset(xmlDoc)
{
	if (xmlDoc != null)
	{
		selectedItemInfoList = xmlDoc.getElementsByTagName('selectedItemInfo');
	}
}

function transcodeToDst()
{
	$("#result" ).text("");

	if (transcodeEnabled == true)
	{
        $("#progressbar").progressbar("value", 0);
        var sourcePath = $("#sourcePath").val();
        var outputFilename = $("#outputFileName").val();
        var startTime = $("#startTime").val();
        var duration = $("#duration").val();
        var frameRate = $("#frameRate").val();
        var outputDirectory = $("#outputDirectory").val();
        var presetPath = $("#presetPath").val();
		var outputXMP = $('input[type="radio"][name="outputXMP"]:checked').val();
        console.log("[Preset path]:%s", presetPath);
        var error = false;
        $("#startTransfer").attr("disabled", "disabled");
        transcodeEnabled = false;
        
        if (sourcePath == "")
        {
            $("#sourcePath").toggle( "highlight" );
            $("#sourcePath").toggle( "highlight" );
            error = true;
        }
    
        if (startTime == "")
        {
            $("#startTime").toggle( "highlight" );
            $("#startTime").toggle( "highlight" );
            error = true;
        }
        
        if (duration == "")
        {
            $("#duration").toggle( "highlight" );
            $("#duration").toggle( "highlight" );
            error = true;
        }
    
        if (frameRate == "")
        {
            $("#frameRate").toggle( "highlight" );
            $("#frameRate").toggle( "highlight" );
            error = true;
        }
    
        if (error == true)
        {
            $("#startTransfer").attr("disabled", "disabled");
            $("#progressbar" ).hide();
            transcodeEnabled = true;
            return;
        }
        
        $("#progressbar" ).show();
        
        var event = new CSEvent("com.adobe.browser.event.TranscodeRequest", "APPLICATION");
        taskID = newGuid();
        var msgID = newGuid();
    
        var messageXML = '<browserMessage><browserID ID="EABROWSER_SOURCE"/><taskID ID="'+taskID+'"/><msgID ID="'+msgID+'"/><presetPath>'+presetPath+'</presetPath><outputDirectory path="'+outputDirectory+'"/><outputXMP>' + outputXMP + '</outputXMP>'+'<transcodeItemList><transcodeItem><filePath path="'+sourcePath+'"/><outputFileName>'+outputFilename+'</outputFileName><frameRate>'+frameRate+'</frameRate><startTime>'+startTime+'</startTime><duration>'+duration+'</duration></transcodeItem></transcodeItemList></browserMessage>';
        
        console.log("[Send message to browser to start transcode]:%s", messageXML);
        event.data = messageXML;
        csInterface.dispatchEvent(event);
		$('#apimessage').val($('#apimessage').val() + "*** [" + (new Date()).toLocaleString() + "] Message from [" + event.type + "] ***\n" + messageXML + "\n\n");
	}
    else
    {
        // do something such as providing a prompt
    }

}

function cancelTranscode()
{
	if (taskID != null)
	{
		var event = new CSEvent("com.adobe.browser.event.TranscodeCancel", "APPLICATION");
		var msgID = newGuid();
		
		var messageXML = '<browserMessage><browserID ID="EABROWSER_SOURCE"/><taskID ID="'+taskID+'"/><msgID ID="'+msgID+'"/></browserMessage>';
		event.data = messageXML;
		console.log("[Send message to browser to cancel transfer]:%s", messageXML);
		csInterface.dispatchEvent(event);
		$('#apimessage').val($('#apimessage').val() + "*** [" + (new Date()).toLocaleString() + "] Message from [" + event.type + "] ***\n" + messageXML + "\n\n");
	}
	
	taskID = null;
	transferEnabled = true;
	$("#startTranscode").removeAttr("disabled");
}

function refreshProgressBar(event)
{
	var xmpContent = event.data;	
	//xmpContent = '<hostNotification><browserID ID="EABROWSER_SOURCE"/><msgID ID="9063fb99-169d-4053-a889-bc0733f1eabc"/><taskID ID="672be504-39b2-3bd8-5156-44c826ce2288"/><percentage>10</percentage></hostNotification>';
	
	var xmlDoc = getXMLDoc(xmpContent);
	console.log("[Response to transfer progress changed event], received data is%s:", xmpContent);
	$('#apimessage').val($('#apimessage').val() + "*** [" + (new Date()).toLocaleString() + "] Message from [" + event.type + "] ***\n" + xmpContent + "\n\n");
	if (xmlDoc != null)
	{
		var percent = parseTransfterProgress(xmlDoc);
		$("#progressbar" ).progressbar("value", parseInt(percent));
	}
	else
	{
	}
}

function refreshTranscodeStatus(event)
{
	var xmpContent = event.data;	
	//xmpContent = '<hostNotification><browserID ID="MediaCollection"/><msgID ID="879a2379-fdbc-4107-86fe-5abbb4c62940"/><taskID ID="879a2379-fdbc-4107-86fe-5abbb4c62940"/><selectedItemInfoList><selectedItemInfo><filePath path="D:\Workspace\testmedia\XDCAMHD250\Clip\C0001.MXF"/><aliasName>C0001</aliasName><type>masterClip</type></selectedItemInfo></selectedItemInfoList></hostNotification>';

	var xmlDoc = getXMLDoc(xmpContent);
	console.log("[Response to transfer status changed event], received data is%s:", xmpContent);
	$('#apimessage').val($('#apimessage').val() + "*** [" + (new Date()).toLocaleString() + "] Message from [" + event.type + "] ***\n" + xmpContent + "\n\n");
	if (xmlDoc != null)
	{
		var result = parseTranscodeStatus(xmlDoc);
		$("#result" ).text(result);
		transcodeEnabled = true;
	}
	else
	{

	}
	taskID = null;
	$("#startTranscode").removeAttr("disabled");	
	$("#progressbar" ).progressbar("value",100);
}


function parseTranscodeStatus(xmlDoc)
{
    var result = "";
    
	if (xmlDoc != null)
	{
        result = xmlDoc.getElementsByTagName('result')[0].firstChild.nodeValue;
        var ret_taskID = xmlDoc.getElementsByTagName('taskID')[0].attributes['ID'].value;
        
        if (ret_taskID == taskID)
        {                        
            if (result != null)
            {
                return result;
            }
             else
            {
                result = 'Error';
            }
        }

	}

	return result;
}

function parseTransfterProgress(xmlDoc)
{
	var percent = 0;

	if (xmlDoc != null)
	{
		 percentList = xmlDoc.getElementsByTagName('percentage');

		 if (percentList.length>0)
		 {
			 percent = percentList[0].firstChild.nodeValue;
		 }
	}

	return percent;
}

function initTranscode()
{
	$("#progressbar").progressbar({
		value: false,
		change: function() {
			console.log("[Progress change]");
			$(".progress-label").text($("#progressbar").progressbar( "value" ) + "%" );
		}
	});

	$("#progressbar").hide();
	$("#progressbar").progressbar("value", 0);
}

function clearTextArea()
{
	$('#apimessage').val("");
}

/**
 * Load JSX file into the scripting context of the product. All the jsx files in 
 * folder [ExtensionRoot]/jsx will be loaded. 
 */
function loadJSX() {
    var extensionRoot = csInterface.getSystemPath(SystemPath.EXTENSION) + "/jsx/";
    csInterface.evalScript('$._ext.evalFiles("' + extensionRoot + '")');
}

function evalScript(script, callback) {
    new CSInterface().evalScript(script, callback);
}

function newGuid()
{
    var guid = "";
    for (var i = 1; i <= 32; i++){
      var n = Math.floor(Math.random()*16.0).toString(16);
      guid +=   n;
      if((i==8)||(i==12)||(i==16)||(i==20))
        guid += "-";
    }
    return guid;    
}
