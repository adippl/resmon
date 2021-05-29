const http=require('http');
const fs=require('fs');
const {execSync}=require("child_process");

var cfgfile=fileToString("./config.json");
const cfg=JSON.parse(cfgfile);
const Uname = checkUname();

const getTopCpu="ps auxw|sort -rk3|head -n10|awk -v b=1 -v e=11 'BEGIN{FS=OFS=\" \"} NR>=2 {for (i=b;i<=e;i++) printf \"%s%s\", $i, (i<e ? OFS : ORS)}'";
const getTopMem="ps auxw|sort -rk4|head -n10|awk -v b=1 -v e=11 'BEGIN{FS=OFS=\" \"} NR>=2 {for (i=b;i<=e;i++) printf \"%s%s\", $i, (i<e ? OFS : ORS)}'";
const getdistro=`grep DISTRIB_ID /etc/lsb-release |cut -d'"' -f2`

const server=http.createServer((req,res)=>{
	if(req.url=='/json'){
		res.statusCode=200;
		res.setHeader('Content-Type','Application/json');
		res.write(JSON.stringify(makeServerStats(),null,'\t'));
		res.end();
		return}
	
	// normal
	res.statusCode=200;
	//res.setHeader('Content-Type','text/plain');
	//res.write("\nConfig:");
	//res.write(JSON.stringify(cfg,null,'\t'));
	//res.write("\nStats:");
	//res.write(JSON.stringify(makeServerStats(),null,'\t'));
	res.setHeader('Content-Type','text/html');
	htmlgen(res,makeServerStats());
	res.end();
	getSystemLoad;
});

server.listen(cfg.port,cfg.hostname,function(){
	console.log(`server running at http://${cfg.hostname}:${cfg.port}/`);});

function fileToString(path){
	return fs.readFileSync(path,'utf8');}

function getSystemLoad(){
	return fs.readFileSync('/proc/loadavg','utf8');}

function checkFS(path){
	let ret=new Object();
	ret.dev=execSync(`/bin/df ${path} |awk 'NR==2 {print $1}'`).toString().slice(0,-1);
	ret.size=parseInt(execSync(`/bin/df ${path} |awk 'NR==2 {print $2}'`).toString().slice(0,-1));
	ret.used=parseInt(execSync(`/bin/df ${path} |awk 'NR==2 {print $3}'`).toString().slice(0,-1));
	ret.free=parseInt(execSync(`/bin/df ${path} |awk 'NR==2 {print $4}'`).toString().slice(0,-1));
	ret.usedPerc=parseInt(execSync(`/bin/df ${path} |awk 'NR==2 {print $5}'`).toString().slice(0,-2));
	ret.mpoint=execSync(`/bin/df ${path} |awk 'NR==2 {print $6}'`).toString().slice(0,-1);
	return(ret);}

function checkDirSize(path){
	let ret=new Object();
	ret.path=path;
	ret.sizeKB=parseInt(execSync(`du -c ${path} |awk 'END{print $1}'`).toString());
	return(ret);}

function checkUname(){
	if(cfg.showUname){
		let obj = new Object();
		obj.unameS=execSync("uname -s").toString().slice(0,-1);
		obj.unameCPU=execSync("uname -p").toString().slice(0,-1);
		obj.unameHwPlatform=execSync("uname -i").toString().slice(0,-1);
		obj.unameOperaingSystem=execSync("uname -o").toString().slice(0,-1);
		obj.unameArch=execSync("uname -m").toString().slice(0,-1);
		if(cfg.showUnameKernelDetails){
			obj.unameKernRelease=execSync("uname -r").toString().slice(0,-1);
			obj.unameKernVersion=execSync("uname -v").toString().slice(0,-1);}
	return(obj);}}

function checkNet(dev){
	if(cfg.showNet){
		let obj={
			inet: []};
		obj.name=dev;
		obj.mac=execSync(`ip addr show ${dev}|awk '/ether/ {print $2}'`).toString().slice(0,-1);
		let inet=execSync(`ip addr show ${dev}|awk '/inet/ {print $2}'`).toString().slice(0,-1).split('\n');
		inet.forEach(function(v){
			obj.inet.push(v);});
		return(obj);}}

function makeServerStats(){
	//let obj=new Object();
	let obj={
		fs: [],
		du: [],
		net: []};
	if(cfg.showLoad){
		let load=fileToString('/proc/loadavg');
		let sload=load.split(' ');
		obj.load1=parseFloat(sload[0]);
		obj.load5=parseFloat(sload[1]);
		obj.load15=parseFloat(sload[2]);}
	
	if(cfg.showUptime){
		let uptime=fileToString('/proc/uptime');
		let suptime=uptime.split(' ');
		obj.uptime=parseFloat(suptime[0]);
		obj.uptimeIdle=parseFloat(suptime[1].slice(0,-1));
		obj.uptimePretty=execSync("/usr/bin/uptime -p").toString().slice(0,-1);
		}
	
	if(cfg.showMem){	
		//let meminfo=fileToString("/proc/meminfo").split('\n');
		//obj.memTotal=meminfo[0].split('/(\s+)/');
		obj.memTotal=parseInt(execSync("awk 'NR==1 {print $2}' /proc/meminfo").toString());
		obj.memFree=parseInt(execSync("awk 'NR==2 {print $2}' /proc/meminfo").toString());
		obj.memAval=parseInt(execSync("awk 'NR==3 {print $2}' /proc/meminfo").toString());
		obj.memBuff=parseInt(execSync("awk 'NR==4 {print $2}' /proc/meminfo").toString());
		obj.memCache=parseInt(execSync("awk 'NR==5 {print $2}' /proc/meminfo").toString());
		
		obj.swapCache=parseInt(execSync("awk 'NR==6 {print $2}' /proc/meminfo").toString());
		obj.swapTotal=parseInt(execSync("awk 'NR==15 {print $2}' /proc/meminfo").toString());
		obj.swapFree=parseInt(execSync("awk 'NR==16 {print $2}' /proc/meminfo").toString());}
	
	if(cfg.showHostname){
		obj.hostname=execSync("hostname").toString().slice(0,-1);
		obj.domainname=execSync("hostname -y").toString().slice(0,-1);}
	else{
		obj.hostname="hostname hidden!";
		obj.domainname="domainname hidden!";}
	
	if(cfg.showUname){
		obj.unameS=Uname.unameS;
		obj.unameCPU=Uname.unameCPU;
		obj.unameHwPlatform=Uname.unameHwPlatform;
		obj.unameOperaingSystem=Uname.unameOperaingSystem;
		obj.unameArch=Uname.unameArch;
		obj.unameKernRelease=Uname.unameKernRelease;
		obj.unameKernVersion=Uname.unameKernVersion;}
	
	if(cfg.showFS){
	cfg.filesystems.forEach(function(v){
		obj.fs.push(checkFS(v));});}
	
	if(cfg.showDirSize){
		cfg.dirDU.forEach(function (v){
			obj.du.push(checkDirSize(v));
			});}
		
	if(cfg.showNet){
		cfg.net.forEach(function (v){
			obj.net.push(checkNet(v));
			});}
	
	
	return(obj);
	}

function htmlgen(res,st){
	let head=`<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<title>resmon ${st.hostname}.${st.domainname}</title>
	<meta name="description" content="The HTML5">
	<meta name="author" content="SitePoint">
	<script type = "text/JavaScript">
		<!--
			function AutoRefresh( t ) {
				setTimeout("location.reload(true);", t);}
		//-->
	</script>
	<style>
		.column {
			float: left;
			width: 50%;
		}
		/* Clear floats after the columns */
		.row:after {
			content: "";
			display: table;
			clear: both;
		}
	</style>
</head>
<body onload = "JavaScript:AutoRefresh(${1000*cfg.reloadTime});">`;
	let tail=`
</body>
</html>`;
	res.write(head);
	res.write(`<h1>${st.hostname}.${st.domainname}</h1>`);
	if(cfg.column){
		res.write(`<div class="row"><div class="column">`);}
	res.write('<ul>');
	if(cfg.showHostname){
		res.write(`<li>hostname:&emsp; ${st.hostname}</li>`);
		res.write(`<li>domainname:&emsp; ${st.domainname}</li>`);}
	if(cfg.showUptime){
		//let d=new Date(st.uptime*1000).toISOString().substr(11, 8)
		//res.write(`<h2>System uptime: ${d}</h2>`);
		//let di=new Date(st.uptimeIdle/4*1000).toISOString().substr(11, 8)
		//res.write(`<h2>System uptime: ${di}</h2>`);
		res.write(`<h2>System uptime: ${st.uptimePretty}</h2>`);}
	if(cfg.showLoad){
		res.write(`<h2>System load:&ensp; ${st.load1} ${st.load5} ${st.load15}</h2>`);
		res.write(`<li>last min:&ensp; ${st.load1}</li>`);
		res.write(`<li>last 5 mins:&ensp; ${st.load5}</li>`);
		res.write(`<li>last 15 mins:&ensp; ${st.load15}</li>`);}
	if(cfg.showMem){
		res.write(`<h2>Memory statistics</h2>`);
		res.write(`<h3>Main Memory</h3>`);
		let mt=Math.round(st.memTotal/(2**cfg.memDivider));
		res.write(`<li>Total:&ensp; ${mt} ${cfg.memUnit}</li>`);
		let mf=Math.round(st.memFree/(2**cfg.memDivider));
		res.write(`<li>Free:&ensp; ${mf} ${cfg.memUnit}</li>`);
		let ma=Math.round(st.memAval/(2**cfg.memDivider));
		res.write(`<li>Avalible:&ensp; ${ma} ${cfg.memUnit}</li>`);
		let mc=Math.round(st.memCache/(2**cfg.memDivider));
		res.write(`<li>Cache:&ensp; ${mc} ${cfg.memUnit}</li>`);
		let mb=Math.round(st.memBuff/(2**cfg.memDivider));
		res.write(`<li>Buffers:&ensp; ${mb} ${cfg.memUnit}</li>`);
		res.write(`<h3>Swap</h3>`);
		let swt=Math.round(st.swapTotal/(2**cfg.memDivider));
		res.write(`<li>Total:&ensp; ${swt} ${cfg.memUnit}</li>`);
		let swf=Math.round(st.swapFree/(2**cfg.memDivider));
		res.write(`<li>Free:&ensp; ${swf} ${cfg.memUnit}</li>`);
		let swc=Math.round(st.swapCache/(2**cfg.memDivider));
		res.write(`<li>Free:&ensp; ${swc} ${cfg.memUnit}</li>`);
		}
	if(cfg.showUname){
		res.write(`<h2>Hardware details</h2>`);
		res.write(`<li>OS:&emsp; ${st.unameOperaingSystem}</li>`);
		res.write(`<li>Architecture:&emsp; ${st.unameArch}</li>`);
		res.write(`<li>CPU:&emsp; ${st.unameCPU}</li>`);
		if(cfg.showUnameKernelDetails){
			res.write(`<li>Kernel Release:&emsp; ${st.unameKernRelease}</li>`);
			res.write(`<li>Kernel Version:&emsp; ${st.unameKernVersion}</li>`);}}
	if(cfg.column){
		res.write(`</ul></div><div class="column"><ul>`);}
	if(cfg.showFS){
		res.write("<h2>Filesystems</h2>");
		st.fs.forEach(function(v){
			res.write(`<h3>${v.mpoint} used: ${v.usedPerc}%</h3>`);
			res.write(`<li>Device:&ensp; ${v.dev}</li>`);
			res.write(`<li>Percentage used:&ensp; ${v.usedPerc}%</li>`);
			res.write(`<li>Size:&ensp; ${Math.round(v.size/(2**cfg.diskDivider))} ${cfg.diskUnit}</li>`);
			res.write(`<li>Used:&ensp; ${Math.round(v.used/(2**cfg.diskDivider))} ${cfg.diskUnit}</li>`);
			res.write(`<li>Free:&ensp; ${Math.round(v.free/(2**cfg.diskDivider))} ${cfg.diskUnit}</li>`);});}
	if(cfg.showDirSize){
		res.write("<h2>Directory size</h2>");
		st.du.forEach(function(v){
			res.write(`<h3>${v.path} size: ${Math.round(v.sizeKB/2**cfg.dirSizeDivider)} ${cfg.dirSizeUnit}</h3>`);});}
	if(cfg.showNet){
		res.write(`<h2>Network Interfaces</h2>`);
		st.net.forEach(function(v){
			res.write(`<h3>Interface name:&ensp; ${v.name}</h3>`);
			res.write(`<li>Interface mac:&ensp; ${v.mac}</li>`);
			v.inet.forEach(function(ine){
				if(ine==""){
					res.write(`<li>Ip address:&ensp; NULL</li>`);}
				else{
					res.write(`<li>Ip address:&ensp; ${ine}</li>`);}
				});
			});
		}
	if(cfg.column){
		res.write(`</div>`);}

	res.write('</ul>');
	res.write(tail);
	}
