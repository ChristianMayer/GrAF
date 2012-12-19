/*
 *  <one line to give the program's name and a brief idea of what it does.>
 *  Copyright (C) 2012  Christian Mayer <email>
 * 
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 * 
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 * 
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#define BOOST_FILESYSTEM_NO_DEPRECATED

#include "graphlib.hpp"

//#include <iostream>
#include <fstream>

#include <boost/filesystem.hpp>

#include "globals.h"

#include "json.hpp"
#include "logger.hpp"

using namespace std;

bool GraphLib::addPath( const string& path )
{
  using namespace boost::filesystem;
  if( exists( path ) && is_directory( path ) )
  {
    for( auto file = directory_iterator( path ); file != directory_iterator(); file++ )
    {
      if( ".graflib" == file->path().extension() )
        addSource( file->path().string() );
    }
    return true;
  }

  return false;
}


void GraphLib::addSource( const string& file )
{
  logger << "reading file '" << file << "'\n";
  ifstream libSource( file );

  try {
    libSource >> JSON::consumeEmpty;
    JSON::readJsonObject( libSource, [this]( istream & in, const string & libName )
    {
      JSON::readJsonObject( in, [&libName,this]( istream & in, const string & blockName )
      {
        lib[ libName + "/" + blockName ].readJsonBlock( in );
      } );
    } );
  } catch( JSON::parseError e )
  {
    int lineNo, errorPos;
    string wrongLine = e.getErrorLine( lineNo, errorPos ) ;
    logger << "!!! caugt error \"" << e.text << "\" in line " << lineNo << " at postion " << errorPos << ":\n";
    logger << "!!! " << wrongLine << "\n";
    logger << "!!!";
    while( 1 < errorPos-- )
      logger << " ";
    logger << "-^-" << endl;
    logger.show();
  }
}

ostream& operator<<( ostream &stream, const GraphLib& lib )
{
  stream << "{";
  for( auto it = lib.lib.cbegin(); it != lib.lib.cend(); it++ )
  {
    if( it != lib.lib.cbegin() ) 
      stream << ",\n";
    else
      stream << "\n";
    stream << "  \"" << it->first << "\": {\n";
    stream << it->second;
    stream << "  }";
  }
  return stream << "\n}" << endl;
}