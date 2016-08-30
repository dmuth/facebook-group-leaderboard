
#
# Configure our Facebook Group Leaderboard app
#
# Note that it will need to be installed manually in /var/www/facebook-group-leaderboard
# from the repo at https://github.com/dmuth/facebook-group-leaderboard
#
# This is because this version of Puppet I'm writing it for doesn't support modules. :-(
#
class software::facebook-group-leaderboard() {

        file {"/etc/init/facebook-leaderboard.conf":
                source => "puppet:///modules/software/facebook-leaderboard.conf",
                owner => root,
                group => root,
                mode => 0644,
        }

        service {"facebook-leaderboard":
                ensure => running,
                enable => true,
                provider => upstart,
                require => File["/etc/init/facebook-leaderboard.conf"],
        }

        file {"/var/www/facebook-group-leaderboard/config/local.json":
                source => "puppet:///modules/software/facebook-leaderboard.json",
                owner => root,
                group => root,
                mode => 0644,
                notify => Service["facebook-leaderboard"],
        }

} # End of facebook-group-leaderboard



