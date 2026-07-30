
# EVN-Harvester                                


EVN-Harvester is a userscript for the webpage bahn.expert, that can be used with Tampermonkey. EVN Harvester collects details from timetables at bahn.expert and creates a list from the found data.
Take a look at the images below for a first impression. 
It has been tested with Firefox 147.02. Works with all modern browsers supporting Tampermonkey on desktop and mobile devices.

How to install:

    Add the tampermonkey extension to a browser that supports it.

You can get it at: https://www.tampermonkey.net/

    Create a new userscript. Add the content of the file evn-harvester.user.js.

    Ensure that the settting for displaying EVN is enabled


I recently added a searchbar.

What it does:

Automatic Scanning: Clicks through all departures and collects data.

EVN Collection: Extracts vehicle numbers for all train parts.

Tab-Progress: Shows the current status (e.g., 7/98) directly in the browser tab title.


How to use the extension:

  Prerequisites:

        Install the Tampermonkey extension.

        Go to settings on bahn.expert and ensure EVN display is ACTIVE (blue toggle).
        Also activate "Linie und Fahrtnummer" if you want it to be included.
       
        
   <img width="513" height="878" alt="necessary settings" src="https://github.com/user-attachments/assets/dd9a466a-8993-4642-9124-76f82d14295b" />

        

        You might have to allow Popups for bahn.expert in your browser (needed for the file download).

  Installation:

        Copy the code from evn-harvester.user.js into a new Tampermonkey script.

  Operation:

        Open any station on bahn.expert.

        Click the "SCAN"  button.

        Wait for the scan to finish. The window will turn black during the process.
        
        The file will be available for download once it's finished.
#

<img width="1917" height="411" alt="screen03" src="https://github.com/user-attachments/assets/b8df3df2-e0f2-4276-8657-17f97065ba6f" />






#


<img width="1901" height="848" alt="screen02" src="https://github.com/user-attachments/assets/5672bf71-2d48-466b-8b9a-f7de1636bef7" />  


  
<img width="549" height="83" alt="Disclaimer2026" src="https://github.com/user-attachments/assets/1a738f54-f04a-45ca-b08e-d15ba341572a" />





