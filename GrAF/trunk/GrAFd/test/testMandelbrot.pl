#!/usr/bin/perl

my $min_x  = -2.0;
my $max_x  =  1.0;
my $step_x =  0.01;
my $min_y  = -1.0;
my $max_y  =  1.0;
my $step_y =  0.01;
my $totCnt =  0  ; # number of pixels within
my $maxCnt =  100;
my $one    =  1  ;
my $two    =  2.0;
my $four   =  4.0;

for( my $pos_x = $min_x; $pos_x <= $max_x; $pos_x += $step_x )
{
  for( my $pos_y = $min_y; $pos_y <= $max_y; $pos_y += $step_y )
  {
    my $cur_x = 0.0;
    my $cur_y = 0.0;
    for( my $cnt = 0; ; $cnt++ )
    {
      my $tmp_x = $cur_x * $cur_x - $cur_y * $cur_y + $pos_x;
      my $tmp_y = 2.0 * $cur_x * $cur_y + $pos_y;
      $cur_x = $tmp_x;
      $cur_y = $tmp_y;
      #print "$pos_x, $pos_y, $cnt -> $totCnt ($cur_x, $cur_y)\n";
      if( $cur_x * $cur_x + $cur_y * $cur_y > 4.0 )
      {
        last;
      }
      if( $cnt > $maxCnt )
      {
        $totCnt++;
        last;
      }
    }
  }
}

print $totCnt . "\n";