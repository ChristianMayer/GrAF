#define BOOST_TEST_DYN_LINK
#define BOOST_TEST_MODULE LogicEngine
#include <boost/test/unit_test.hpp>

#include "logicengine.h"
#include "logic_elements.h"

/**
 * first test
 */
BOOST_AUTO_TEST_CASE( test1 )
{
  // reports 'error in "test1": test 2 == 1 failed'
  BOOST_CHECK( 2 == 2 );
}

/**
 * test of a full program
 */
BOOST_AUTO_TEST_CASE( total )
{
  LogicEngine le(200);
  
  typedef float flt;
  raw_offset_t min_x  = le.registerVariable<flt>( "min_x"  );
  raw_offset_t max_x  = le.registerVariable<flt>( "max_x"  );
  raw_offset_t step_x = le.registerVariable<flt>( "step_x" );
  raw_offset_t pos_x  = le.registerVariable<flt>( "pos_x"  );
  raw_offset_t cur_x  = le.registerVariable<flt>( "cur_x"  );
  raw_offset_t tmp_x  = le.registerVariable<flt>( "tmp_x"  );
  raw_offset_t min_y  = le.registerVariable<flt>( "min_y"  );
  raw_offset_t max_y  = le.registerVariable<flt>( "max_y"  );
  raw_offset_t step_y = le.registerVariable<flt>( "step_y" );
  raw_offset_t pos_y  = le.registerVariable<flt>( "pos_y"  );
  raw_offset_t cur_y  = le.registerVariable<flt>( "cur_y"  );
  raw_offset_t tmp_y  = le.registerVariable<flt>( "tmp_y"  );
  raw_offset_t totCnt = le.registerVariable<int>( "totCnt" );
  raw_offset_t cnt    = le.registerVariable<int>( "cnt"    );
  raw_offset_t maxCnt = le.registerVariable<int>( "maxCnt" );
  raw_offset_t one    = le.registerVariable<int>( "one"    );
  raw_offset_t two    = le.registerVariable<flt>( "two"    );
  raw_offset_t four   = le.registerVariable<flt>( "four"   );
  raw_offset_t tmpRel = le.registerVariable<int>( "tmpRel" );
  raw_offset_t tmp    = le.registerVariable<flt>( "tmp"    );
  
  le.addElement( new LogicElement_Const<flt>( min_x , -2.0 ) );
  le.addElement( new LogicElement_Const<flt>( max_x ,  1.0 ) );
  le.addElement( new LogicElement_Const<flt>( step_x,  0.01f ) );
  le.addElement( new LogicElement_Const<flt>( min_y , -1.0 ) );
  le.addElement( new LogicElement_Const<flt>( max_y ,  1.0 ) );
  le.addElement( new LogicElement_Const<flt>( step_y,  0.01f ) );
  le.addElement( new LogicElement_Const<int>( totCnt,  0   ) ); // number of pixels within
  le.addElement( new LogicElement_Const<int>( maxCnt,  100 ) );
  le.addElement( new LogicElement_Const<int>( one   ,  1   ) );
  le.addElement( new LogicElement_Const<flt>( two   ,  2.0 ) );
  le.addElement( new LogicElement_Const<flt>( four  ,  4.0 ) );
  
  //LogicElement_Generic** startPoint = le.nextElementPosition();
  
  le.addElement( new LogicElement_Move<flt>( pos_x, min_x ) ); // init for(x)
  LogicElement_Generic** x_LoopStart = le.nextElementPosition();
  le.addElement( new LogicElement_Move<flt>( pos_y, min_y ) ); // init for(y)
  LogicElement_Generic** y_LoopStart = le.nextElementPosition();
  
  le.addElement( new LogicElement_Move<flt>( cur_x, le.ground() ) );
  le.addElement( new LogicElement_Move<flt>( cur_y, le.ground() ) );
  le.addElement( new LogicElement_Move<int>( cnt, le.ground() ) ); // init for(inner)
  LogicElement_Generic** cnt_LoopStart = le.nextElementPosition();
  
  /*
   *  xt = x * x - y * y + cx
   *  yt = 2 * x * y + cy
   *  x = xt
   *  y = yt
   *  iter = iter + 1
   *  betrag_quadrat = x * x + y * y
   */
  le.addElement( new LogicElement_Move<flt>( tmp_x, pos_x ) );
  le.addElement( new LogicElement_MulAdd<flt>( tmp_x, cur_x, cur_x ) ); // +x*x
  le.addElement( new LogicElement_MulSub<flt>( tmp_x, cur_y, cur_y ) ); // -y*y
  le.addElement( new LogicElement_Move<flt>( tmp_y, pos_y ) );
  le.addElement( new LogicElement_Mul<flt>( tmp, cur_x, cur_y ) ); // x*y
  le.addElement( new LogicElement_MulAdd<flt>( tmp_y, two, tmp ) ); // +2*tmp
  le.addElement( new LogicElement_Move<flt>( cur_x, tmp_x ) );
  le.addElement( new LogicElement_Move<flt>( cur_y, tmp_y ) );
  le.addElement( new LogicElement_Mul<flt>( tmp, cur_x, cur_x ) ); // x*x
  le.addElement( new LogicElement_MulAdd<flt>( tmp, cur_y, cur_y ) ); // +y*y
  
  //le.addElement( new LogicElement_Dump( le ) );
  
  le.addElement( new LogicElement_Rel<int, flt>( tmpRel, tmp, four, LogicElement_Rel<int, flt>::GREATER ) );
  le.addElement( new LogicElement_JumpTrue<int>( 6, tmpRel ) ); // if x*x+y*y > 4.0 => jump after totCnt++
  le.addElement( new LogicElement_Rel<int, flt>( tmpRel, cnt, maxCnt, LogicElement_Rel<int, flt>::GREATER ) );
  le.addElement( new LogicElement_JumpTrue<int>( 3, tmpRel ) ); // if cnt > maxCnt => jump to totCnt++
  
  le.addElement( new LogicElement_Sum<int>( cnt, cnt, one ) ); // step for inner
  int offsetTostartForLoops = le.nextElementPosition() - cnt_LoopStart;
  le.addElement( new LogicElement_Jump( -offsetTostartForLoops ) ); // for(inner)
  
  le.addElement( new LogicElement_Sum<int>( totCnt, totCnt, one ) ); // increase final result counter
  
  le.addElement( new LogicElement_Sum<flt>( pos_y, pos_y, step_y ) ); // step for y
  le.addElement( new LogicElement_Rel<int, flt>( tmpRel, pos_y, max_y, LogicElement_Rel<int, flt>::LESSEQUAL ) );
  offsetTostartForLoops = le.nextElementPosition() - y_LoopStart;
  le.addElement( new LogicElement_JumpTrue<int>( -offsetTostartForLoops, tmpRel ) ); // if y <= max_y continung for(y)
  
  le.addElement( new LogicElement_Sum<flt>( pos_x, pos_x, step_x ) ); // step for x
  le.addElement( new LogicElement_Rel<int, flt>( tmpRel, pos_x, max_x, LogicElement_Rel<int, flt>::LESSEQUAL ) );
  offsetTostartForLoops = le.nextElementPosition() - x_LoopStart;
  le.addElement( new LogicElement_JumpTrue<int>( -offsetTostartForLoops, tmpRel ) ); // if x <= max_x continung for(x)
  
  le.run();
  
  std::cout << le.readString<int  >(totCnt) << std::endl;
  BOOST_CHECK( le.read<int>(totCnt) == 15459 );
}