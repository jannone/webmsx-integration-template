/**
 * dsktool port to Javascript
 * @author Rafael Jannone <jannone@gmail.com>
 */

const diskBasic = [
  0xeb, 0xfe, 0x90, 0x4d, 0x53, 0x58, 0x5f, 0x30, 0x34, 0x20, 0x20, 0x00, 0x02, 0x02, 0x01, 0x00,
  0x02, 0x70, 0x00, 0xa0, 0x05, 0xf9, 0x03, 0x00, 0x09, 0x00, 0x02, 0x00, 0x00, 0x00, 0x18, 0x10,
  0x56, 0x4f, 0x4c, 0x5f, 0x49, 0x44, 0x00, 0x34, 0x66, 0x07, 0x70, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xd0, 0xed, 0x53, 0x6a, 0xc0, 0x32, 0x72, 0xc0, 0x36, 0x67, 0x23, 0x36, 0xc0, 0x31, 0x1f, 0xf5,
  0x11, 0xab, 0xc0, 0x0e, 0x0f, 0xcd, 0x7d, 0xf3, 0x3c, 0x28, 0x26, 0x11, 0x00, 0x01, 0x0e, 0x1a,
  0xcd, 0x7d, 0xf3, 0x21, 0x01, 0x00, 0x22, 0xb9, 0xc0, 0x21, 0x00, 0x3f, 0x11, 0xab, 0xc0, 0x0e,
  0x27, 0xcd, 0x7d, 0xf3, 0xc3, 0x00, 0x01, 0x69, 0xc0, 0xcd, 0x00, 0x00, 0x79, 0xe6, 0xfe, 0xd6,
  0x02, 0xf6, 0x00, 0xca, 0x22, 0x40, 0x11, 0x85, 0xc0, 0x0e, 0x09, 0xcd, 0x7d, 0xf3, 0x0e, 0x07,
  0xcd, 0x7d, 0xf3, 0x18, 0xb8, 0x42, 0x6f, 0x6f, 0x74, 0x20, 0x65, 0x72, 0x72, 0x6f, 0x72, 0x0d,
  0x0a, 0x50, 0x72, 0x65, 0x73, 0x73, 0x20, 0x61, 0x6e, 0x79, 0x20, 0x6b, 0x65, 0x79, 0x20, 0x66,
  0x6f, 0x72, 0x20, 0x72, 0x65, 0x74, 0x72, 0x79, 0x0d, 0x0a, 0x24, 0x00, 0x4d, 0x53, 0x58, 0x44,
  0x4f, 0x53, 0x20, 0x20, 0x53, 0x59, 0x53
]

function _word (W, X) {
  return W + (X << 8)
}

function _int (W, X, Y, Z) {
  return W + (X << 8) + (Y << 16) + (Z << 24)
}

function writeWord (arr, address, value) {
  var W = value & 0xFF
  var X = (value >> 8) & 0xFF
  arr[address] = W
  arr[address + 1] = X
}

function writeInt (arr, address, value) {
  var W = value & 0xFF
  var X = (value >> 8) & 0xFF
  var Y = (value >> 16) & 0xFF
  var Z = (value >> 24) & 0xFF
  arr[address] = W
  arr[address + 1] = X
  arr[address + 2] = Y
  arr[address + 3] = Z
}

function readWord (arr, address) {
  return _word(arr[address], arr[address + 1])
}

function readInt (arr, address) {
  return _int(arr[address], arr[address + 1], arr[address + 2], arr[address + 3])
}

function memset (arr, address, value, len) {
  while (len-- > 0) {
    arr[address++] = value
  }
}

function memcpy (dest, d_address, source, s_address, len) {
  while (len-- > 0) {
    dest[d_address++] = source[s_address++]
  }
}

function create_dsk (boot) {
  boot = boot || diskBasic
  const dskimage = []
  memset(dskimage, 0, 0, 720 * 1024)
  // memcpy(dskimage, 0, msxboot, 0, 512)
  memcpy(dskimage, 0, boot, 0, boot.length)

  var attr = load_dsk(dskimage)
  dskimage[attr.fat] = 0xF9
  dskimage[attr.fat + 1] = 0xFF
  dskimage[attr.fat + 2] = 0xFF

  return dskimage
}

function load_dsk (dskimage) {
  // dsk size = 720*1024
  // msxboot = 512

  var attr = {
    reservedsectors: readWord(dskimage, 0x0E),
    numberoffats: dskimage[0x10],
    sectorsperfat: readWord(dskimage, 0x16),
    bytespersector: readWord(dskimage, 0x0B),
    direlements: readWord(dskimage, 0x11)
  }

  attr.fat = attr.bytespersector * attr.reservedsectors
  attr.direc = attr.fat + attr.bytespersector * (attr.sectorsperfat * attr.numberoffats)
  attr.cluster = attr.direc + attr.direlements * 32
  attr.availsectors = 80 * 9 * 2 - attr.reservedsectors - attr.sectorsperfat * attr.numberoffats
  attr.availsectors -= attr.direlements * 32 / attr.bytespersector
  attr.fatelements = attr.availsectors / 2

  return attr
}

function getfileinfo (dskimage, attr, pos) {
  var dir = attr.direc + pos * 32
  if (dskimage[dir] < 0x20 || dskimage[dir] >= 0x80) {
    return null
  }

  var fileinfo = {
    name: '',
    ext: '',
    size: 0,
    sec: 0,
    min: 0,
    hour: 0,
    day: 0,
    month: 0,
    year: 0,
    first: 0,
    pos: 0,
    attr: 0
  }

  var i, cdir
  for (i = 0; i < 8; i++) {
    cdir = dskimage[dir + i]
    if (cdir === 0x20 || cdir === 0) {
      break
    }
    fileinfo.name += String.fromCharCode(cdir)
  }

  for (i = 0; i < 3; i++) {
    cdir = dskimage[dir + i + 8]
    if (cdir === 0x20 || cdir === 0) {
      break
    }
    fileinfo.ext += String.fromCharCode(cdir)
  }

  fileinfo.size = readInt(dskimage, dir + 0x1C)

  i = readWord(dskimage, dir + 0x16)
  fileinfo.sec = (i & 0x1F) << 1
  fileinfo.min = (i >> 5) & 0x3F
  fileinfo.hour = i >> 11

  i = readWord(dskimage, dir + 0x18)
  fileinfo.day = i & 0x1F
  fileinfo.month = (i >> 5) & 0xF
  fileinfo.year = 1980 + (i >> 9)

  fileinfo.first = readWord(dskimage, dir + 0x1A)
  fileinfo.pos = pos
  fileinfo.attr = dskimage[dir + 0xB]

  return fileinfo
}

function pad2 (v) {
  return ('00' + v).substr(-2, 2)
}

function fmtDate (arr) {
  return arr.map(pad2).join('/')
}

function fmtTime (arr) {
  return arr.map(pad2).join(':')
}

function list_dsk (dskimage, attr) {
  var name = ''
  var i
  for (i = 0; i < 8; i++) {
    var c = dskimage[3 + i]
    if (c === 0x20 || c === 0) {
      break
    }
    name += String.fromCharCode(c)
  }

  var ret = {
    volume: name,
    files: [],
    free: 0
  }

  for (i = 0; i < attr.direlements; i++) {
    fileinfo = getfileinfo(dskimage, attr, i)
    if (fileinfo !== null) {
      name = (fileinfo.ext !== '') ? fileinfo.name : (fileinfo.name + '.' + fileinfo.ext)
      var type = ''
      if (fileinfo.attr & 0x8) {
        type = '<VOL>'
      }
      if (fileinfo.attr & 0x10) {
        type = '<DIR>'
      }
      var date = [fileinfo.day, fileinfo.month, fileinfo.year]
      var time = [fileinfo.hour, fileinfo.min, fileinfo.sec]
      ret.files.push({
        name: name,
        type: type,
        size: fileinfo.size,
        date: fmtDate(date),
        time: fmtTime(time)
      })
    }
  }
  var free = bytes_free(dskimage, attr)
  ret.free = free
  return ret
}

function remove_link (dskimage, attr, link) {
  var current
  var p0, p1, p2

  var pos = (link >> 1) * 3
  if (link & 1) {
    p1 = dskimage[attr.fat + pos + 1]
    p2 = dskimage[attr.fat + pos + 2]
    current = (p2 << 4) + (p1 >> 4)
    dskimage[attr.fat + pos + 2] = 0
    dskimage[attr.fat + pos + 1] &= 0xF
  } else {
    p0 = dskimage[attr.fat + pos]
    p1 = dskimage[attr.fat + pos + 1]
    current = ((p1 & 0xF) << 8) + p0
    dskimage[attr.fat + pos] = 0
    dskimage[attr.fat + pos + 1] &= 0xF0
  }
  return current
}

function wipe (dskimage, attr, fileinfo) {
  var current = fileinfo.first
  do {
    current = remove_link(dskimage, attr, current)
  } while (current != 0xFFF)
  dskimage[fileinfo.direc + fileinfo.pos * 32] = 0xE5
}

function next_link (dskimage, attr, link) {
  var pos = (link >> 1) * 3
  var p0, p1, p2

  if (link & 1) {
    p1 = dskimage[attr.fat + pos + 1]
    p2 = dskimage[attr.fat + pos + 2]
    return (p2 << 4) + (p1 >> 4)
  } else {
    p0 = dskimage[attr.fat + pos]
    p1 = dskimage[attr.fat + pos + 1]
    return ((p1 & 0xF) << 8) + p0
  }
}

function bytes_free (dskimage, attr) {
  var avail = 0

  for (var i = 2; i < 2 + attr.fatelements; i++) {
    if (!next_link(dskimage, attr, i)) {
      ++avail
    }
  }

  return avail * 1024
}

function get_free (dskimage, attr) {
  for (var i = 2; i < 2 + attr.fatelements; i++) {
    if (!next_link(dskimage, attr, i)) {
      return i
    }
  }
  throw 'Internal error'
}

function get_next_free (dskimage, attr) {
  var status = 0

  for (var i = 2; i < 2 + attr.fatelements; i++) {
    if (!next_link(dskimage, attr, i)) {
      if (status) {
        return i
      } else {
        status = 1
      }
    }
  }

  throw 'Internal error'
}

function store_fat (dskimage, attr, link, next) {
  var pos = (link >> 1) * 3
  var p0, p1, p2
  if (link & 1) {
    p1 = attr.fat + pos + 1
    p2 = attr.fat + pos + 2
    dskimage[p2] = next >> 4
    dskimage[p1] &= 0xF
    dskimage[p1] |= (next & 0xF) << 4
  } else {
    p0 = attr.fat + pos
    p1 = attr.fat + pos + 1
    dskimage[p0] = next & 0xFF
    dskimage[p1] &= 0xF0
    dskimage[p1] |= next >> 8
  }
}

function add_single_file (dskimage, attr, name, data) {
  var fileinfo; var found = false
  var i
  for (i = 0; i < attr.direlements; i++) {
    if ((fileinfo = getfileinfo(dskimage, attr, i)) !== null) {
      if (fileinfo.name == name) {
        found = true
        wipe(dskimage, attr, fileinfo)
        break
      }
    }
  }

  var size = data.length
  var free = bytes_free(dskimage, attr)
  if (size > free) {
    throw 'disk full'
  }

  // if (found) {
  //   console.log("updating ", name);
  // } else {
  //   console.log("adding ", name);
  // }

  for (i = 0; i < attr.direlements; i++) {
    var cdir = dskimage[attr.direc + i * 32]
    if (cdir < 0x20 || cdir >= 0x80) {
      break
    }
  }
  if (i == attr.direlements) {
    throw 'directory is full'
  }
  var pos = i

  var total = (size + 1023) >> 10
  var current, first, next
  current = first = get_free(dskimage, attr)
  var source = 0

  for (i = 0; i < total;) {
    memcpy(dskimage, attr.cluster + (current - 2) * 1024, data, source, 1024)
    source += 1024
    if (++i == total) {
      next = 0xFFF
    } else {
      next = get_next_free(dskimage, attr)
    }
    store_fat(dskimage, attr, current, next)
    current = next
  }

  memset(dskimage, attr.direc + pos * 32, 0, 32)
  memset(dskimage, attr.direc + pos * 32, 0x20, 11)

  i = 0
  for (var p = 0, _len = name.length; p < _len; p++) {
    var cname = name[p]
    if (cname == '.') {
      i = 8
      continue
    }
    dskimage[attr.direc + pos * 32 + i++] = cname.toUpperCase().charCodeAt(0)
  }

  writeWord(dskimage, attr.direc + pos * 32 + 0x1A, first)
  writeInt(dskimage, attr.direc + pos * 32 + 0x1C, size)

  var dt = new Date()
  var ti = (dt.getSeconds() >> 1) + (dt.getMinutes() << 5) + (dt.getHours() << 11)
  var da = (dt.getDate()) + ((dt.getMonth() + 1) << 5) + ((dt.getFullYear() - 1980) << 9)

  writeWord(dskimage, attr.direc + pos * 32 + 0x16, ti)
  writeWord(dskimage, attr.direc + pos * 32 + 0x18, da)
}

function flush_dsk (dskimage, attr) {
  memcpy(dskimage, attr.fat + attr.bytespersector * attr.sectorsperfat,
    dskimage, attr.fat,
    attr.bytespersector * attr.sectorsperfat)
}

function write_dsk (dskimage, filename, cb) {
  var buffer = new Buffer(dskimage)
  fs.writeFile(filename, buffer, 'binary', cb)
}
