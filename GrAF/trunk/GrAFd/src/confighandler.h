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

#ifndef CONFIGHANDLER_H
#define CONFIGHANDLER_H

#include <string>

class ConfigHandler
{
public:
  /**
   * @brief Parse the command line parameters and a config file
   *
   * @param argc The argc of the main function
   * @param argv The argv of the main function
   * @return string Non empty when program should stop immediately (e.g. the user only
   *              wants to display the version.
   **/
  bool parse( int argc, const char* argv[] );
  
private:
  std::string config_file;
};

#endif // CONFIGHANDLER_H
