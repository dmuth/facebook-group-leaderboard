
# Facebook Group Stats

This is a Node.js app which uses the Facebook Graph API to download recent posts from 1 or more groups,
and display the top posters and top commenters in a leaderboard-style format.  In production, I use this app
to keep track of some gruops I admin with thousands of users each, and make sure that no one is
unecssarily spamming the group.

**Live Demo:** <a href="http://www.dmuth.org/facebook">http://www.dmuth.org/facebook</a>.


## Setup and configuration


### The Easy Way

Create a new app at <a href="https://developers.facebook.com/">https://developers.facebook.com/</a>.

Copy `config/local.json.DIST` to `config/local.json` and then run `npm start` on the command line.
The onboarding process will throw an error for each configuration file that needs to be set, effectively 
walking you through the configuration process a step at a time.  When configuration is complete,
the app will continue to run and the webserver will start up at `http://localhost:3000/`.


### The Hard Way

Create a new app at <a href="https://developers.facebook.com/">https://developers.facebook.com/</a>.

Next, copy `config/local.json.DIST` to `config/local.json` and edit `config/local.json`.  
You'll need to be sure to update the Session Secret, the App ID and App Secret, and edit group 
information for groups you want to monitor.  Then run `npm start` to start up the server.

Honestly, The Easy Way would have been quicker.  You should have done that instead. :-)


