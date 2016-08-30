
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


## Frequently Asked Questions


### Why is node_modules in this repository?

I'm a **huge** fan of reproducable builds. You should be, too. Ensuring that anyone who clones this 
repo has a byte-for-byte copy of the code base prevents an entire class of bugs from
that could arise if a different version of a required module introcuces a subtle bug.


### What about rate limiting?

Yep, Facebook does rate-limiting.  That process is documented <a 
	href="https://developers.facebook.com/docs/graph-api/advanced/rate-limiting">here</a>.
It will be up to you to make sure that you don't query too many groups too frequently 
that you don't run afoul of Facebook's limits.

That said, since they offer 200 queries per user per hour for your app, the more users you
have visiting your app, the more queries you'll get. :-)

Speaking of tokens...


### How do you handle access token expiration?

By default, the tokens that we get (via the <a href="http://passportjs.org/">Passport module</a>)
are good for 60 days.  Once they've expired, those users will need to log in again.

While Facebook does offer the ability to extend tokens, it's a multi-step process, and I 
didn't know if I wanted to take the project in that direction quiet yet.  I'll see how
things behave after running in production for awhile.  If tokens expiring you is causing
a serious operational impact, please feel free to 
<a href="https://github.com/dmuth/facebook-group-leaderboard/issues">file a bug</a>.

Speaking of tokens expiring...


### How are access tokens managed?

One of my goals of building this app was to have it be fairly lightweight, so I decided
against having a depenedency on any sort of external data store.  Instead, I make use of
<a href="https://github.com/lionc/persistent-cache">of the excellent persistent-cache module</a>
to store access tokens on disk between runs.

My token subsystem is actually fairly complicated--in addition to storing tokens, it keeps track
of metadata such as expiration times, the time a token was tried, when it was last successfully used,
and how many errors there have been since its last use.

To keep a single bad access token from strangling the application, every time the `token.get()` function
is called, the access token at the top of the array is returned, then it is unshifted from that array
and pushed onto the end so that that the access token next in line will be read on the next call
to `token.get()`.

Additionally, the token class keeps module-wide state to ensure that only one callback at a tie
can write to the physical file on disk.  This prevents data corruption.


### Why do you use the debug module so much?

I found it helpful to be able to break down output by type of message, and debug seemed to be 
the best module for the job.  If there is an alternative that you feel is better suited 
for that task, please file a bug and let me know. :-)"


## Known Bugs/Issues


### Blocked Users

If a user has blocked (or been blocked by) the user who owns an access token that is used to
query Facebook graph, that blocked/blcoking user will not show up in the response from Facebook,
and consequently will not show up in any leaderboards.


### Groups must be Open

A group's status must be "Open".  This app will not attept to index closed and private groups
because ensuring that the users with access to those groups are the ones who access tokens
are being used to query Facebook would require substantial work to make happen, and I'm
not sure if it's worth the effort at this point.


## Deployment in Production

If you're running this app on a production machine, you probably don't want to just type 
`npm start` and walk away.  Here are some configurations I can recommend, based on my own
knowledge and experience:

<ul>

<li>
<a href="deploy/nginx.conf">Nginx.conf</a> - Sample configuratio to run this app behind the
`/facebook` endpoint on an Nginx webserver that is serving up another site.  Note that we
have to take special care with the `proxy_redirect` configuration to rewrite redirects as
well sa the `sub_filter` configuration to rewrite HTML and image links.
</li>

<li>
<a href="deploy/facebook-leaderboard.conf">Upstart Configuration</a> - This is a fairly straightforward
configuration for Upstart to run the app as a server.  Install it and use `start facebook-leaderboard`
to kick off the app.
</li>

<li>
<a href="deploy/puppet-manifest.pp">Puppet Manifest</a> - A sample manifest for installation the 
Upstart file and local.json file via Puppet.  (Note that there isn't support for the `vcsrepo` module,
as my current version of Puppet doesn't seem to have module support.  Sorry!)
</li>

</ul>

If you have any configurations you'd like to have included, please send me a pull request!


## Contact info

- Email: doug.muth AT gmail.com and dmuth AT dmuth.org
- Twitter: <a href="http://twiter.com/dmuth">@dmuth</a>
- Facebook: <a href="http://www.facebook.com/dmuth">Facebook.com/Dmuth</a>







