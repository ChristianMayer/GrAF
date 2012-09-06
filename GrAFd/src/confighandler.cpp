/*
    <one line to give the program's name and a brief idea of what it does.>
    Copyright (C) 2012  Christian Mayer <email>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

#include <fstream>
#include <iterator>

#include <boost/program_options.hpp>

#include "globals.h"

#include "confighandler.h"

namespace po = boost::program_options;
using namespace std;

bool ConfigHandler::parse( int argc, const char* argv[] )
{
  try {
    int opt;
    
    // Declare a group of options that will be
    // allowed only on command line
    po::options_description generic ( "Generic options" );
    generic.add_options()
    ( "version,v", "print version string" )
    ( "help", "produce help message" )
    ( "config,c", po::value<string> ( &config_file )->default_value ( "/etc/GrAF/GrAFd.conf" ),
      "name of a file of a configuration." )
    ;
    
    // Declare a group of options that will be
    // allowed both on command line and in
    // config file
    po::options_description config ( "Configuration" );
    config.add_options()
    ( "optimization", po::value<int> ( &opt )->default_value ( 10 ),
      "optimization level" )
    ;
    
    po::options_description cmdline_options;
    cmdline_options.add ( generic ).add ( config );
    
    po::options_description config_file_options;
    config_file_options.add ( config );
    
    po::options_description visible ( "Allowed options" );
    visible.add ( generic ).add ( config );
    
    po::variables_map vm;
    store ( po::command_line_parser ( argc, argv ).
    options ( cmdline_options ).run(), vm );
    notify ( vm );
    
    ifstream ifs ( config_file.c_str() );
    if ( ifs ) {
      // only when file does exists
      store ( parse_config_file ( ifs, config_file_options ), vm );
      notify ( vm );
    }
    
    if ( vm.count ( "help" ) ) {
      visible.print( std::cout );
      return true;  // exit application!
    }
    
    if ( vm.count ( "version" ) ) {
      cout << PROJECT_NAME << " version: " << VERSION << endl;
      return true;  // exit application!
    }
    
    if ( vm.count ( "include-path" ) ) {
      //cout << "Include paths are: "
      //<< vm["include-path"].as< vector<string> >() << "\n";
    }
    
    if ( vm.count ( "input-file" ) ) {
      //cout << "Input files are: "
      //<< vm["input-file"].as< vector<string> >() << "\n";
    }
    
    //cout << "Optimization level is " << opt << "\n";
    
  } catch ( exception& e ) {
    cout << e.what() << "\n";
    return true; // exit application!
  }
  return false;
}