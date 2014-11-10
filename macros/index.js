
unaryop (<-) 49 {
  macro {
    case { $ctx $channel:expr } => {
      letstx $csp = [makeIdent('csp', #{$ctx})];
      return #{ yield $csp.take($channel) }
    }
  }
}

binaryop (<-) 50 right {
  macro {
    case { $ctx $value $channel } => {
      letstx $csp = [makeIdent('csp', #{$ctx})];
      return #{ yield $csp.put($channel, $value) }
    }
  }
}

macro (<-alts) {
  case { $ctx } => {
    letstx $csp = [makeIdent('csp', #{$ctx})];
    return #{ yield $csp.alts }
  }
}

let go = macro {
  case { $ctx ({ $code ... }) } => {
    letstx $csp = [makeIdent('csp', #{$ctx})];
    return #{ $csp.go(function*() { $code ... }) };
  }
  case { $ctx } => {
    return #{ go }
  }
}

export (<-);
export (<-alts);
export go;
