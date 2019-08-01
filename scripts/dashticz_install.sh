#!/bin/bash
# Dashticz Installation script
#
#Execute this script via:
# . <(wget -qO - https://raw.githubusercontent.com/Dashticz/dashticz/beta/scripts/dashticz_install.sh )

REPOSITORY="https://github.com/Dashticz/dashticz"
myport=8082

echo This is the installation script for Dashticz
retry=true

while "$retry"; do
    echo The script will create a folder for Dashticz in the following location:
    echo `pwd`
    echo
    read -p "Enter the folder name [dashticz]: " NAME
    NAME=${NAME:-dashticz}
    echo
    echo Dashticz will be installed in
    echo ${NAME}
    echo
    retry=false
    if [ -d "$NAME" ]; then
        echo "*** ERROR ***"
        echo This folder already exists.
        echo Provide a new folder name to install Dashticz
        echo If you want to update Dashticz, cancel the install and run the following commands:
        echo
        echo "cd $NAME && make update"
        echo
        retry=true
    fi
done
retry=true
while "$retry"; do
    echo
    echo "Dashticz has a master branch (=stable) and a beta branch (=most up-to-date)"
    read -p "Which branch to install? [master]: " BRANCH
    BRANCH=${BRANCH:-master}
    retry=false
    if ! [[ "$BRANCH" =~ ^(master|beta)$ ]]; then
        echo Please enter master or beta
        retry=true
    fi
done
echo
echo "Now cloning the Dashticz repository $REPOSITORY"
echo 
git clone "$REPOSITORY" -b "$BRANCH" "$NAME" || ( echo Error. Something went wrong. Exiting; exit 1 )
echo
cd "$NAME"

echo "Configuring Dashticz."
echo
read -p "What is the IP:port address of your Domoticz server? (example: 192.168.178.18:8080): " domip
domip=${domip:-192.168.178.18:8080}
echo
cd custom
cp CONFIG_DEFAULT.js CONFIG.js
sed -i "s/192.168.1.3:8084/$domip/g" CONFIG.js
cd ..

echo "Finding a free port for Dashticz"
retry=true
while "$retry"; do
    # count the number of occurrences of port $myport in output: 1= in use; 0 = not in use
    result=$(ss -ln src :$myport | grep -Ec -e "\<$myport\>")
    if [ "$result" -eq 1 ]; then
        echo "Port $myport is in use"
        myport=$((myport + 1))
    else
        echo "Port $myport is NOT in use"
        retry=false
    fi
done
echo
echo "Setting up Dashticz on port $myport"
echo
#Checking whether make is installed
if [ $(dpkg-query -W -f='${Status}' make 2>/dev/null | grep -c "ok installed") -eq 0 ];
then
  sudo apt-get install make;
fi
echo
make start PORT="$myport"
echo

statusok=true
printf "Trying Domoticz IP..."
reply=`wget -q -T 3 -t 1 --spider --server-response "$domip" 2>&1 | awk '/^  HTTP/{print $2}'`

if [[ "$reply" != 200 ]]; then
    echo "Domoticz IP is not correct: no valid reply" 
    statusok=false
fi
if [ "$statusok" == true ]; then
    reply=`wget -q -T 3 -t 1 --spider --server-response "$domip"'/json.htm?type=command&param=getversion' 2>&1 | awk '/^  HTTP/{print $2}'`
#    echo "$reply"
    if [[ "$reply" != 200 ]]; then
        echo "Domoticz IP is not correct: no valid reply" 
        statusok=false
    fi
fi
if [ "$statusok" == true ]; then
    reply=`wget -q -O - -T 3 -t 1 "$domip"'/json.htm?type=command&param=getversion' | grep -Po '"status".*\K".*"'`
    if [[ "$reply" != '"OK"' ]]; then
        echo "Domoticz status reply is not correct: no valid reply" 
        statusok=false
    fi
fi
if [ "$statusok" == true ]; then
    echo "OK!"
else
    echo "Domoticz is not responding correctly"
    echo "Please check custom/CONFIG.js."
    echo "You might have to correct the Domoticz IP address or to configure the Domoticz username and/or password."
fi

echo All done
echo


