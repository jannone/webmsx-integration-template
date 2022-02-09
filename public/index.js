/**
 * WebMSX integration helpers
 * @author Rafael Jannone <jannone@gmail.com>
 */

function emulatorRun() {
  const disk = {
    name: 'MyDisk',
    content: buildDisk({
      'autoexec.bas': "10 CLS:PRINT\"HELLO WORLD!\"",
    })
  }
  const altPower = 0 // ??
  try {
    WMSX.room.diskDrive.loadDiskStackFromFiles(0, [disk], altPower)
  } catch (ex) {
    console.error(ex)
    throw new Error('Could not load your files into the emulator')
  }  
  WMSX.room.machine.reset()
}

function buildDisk(files) {
  const dskimage = create_dsk() // disk-basic boot by default
  const attr = load_dsk(dskimage)

  for (const filename in files) {
    const content = files[filename].trim().replace(/\n/g, '\r\n')
    if (content.length > 0) {
      const data = content.split('').map(function(c) { return c.charCodeAt(0); })
      add_single_file(dskimage, attr, filename, data)
    }
  }

  flush_dsk(dskimage, attr)
  load_dsk(dskimage)
  return dskimage
}
