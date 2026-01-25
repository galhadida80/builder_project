import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Card from '@mui/material/Card'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MenuItem from '@mui/material/MenuItem'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import { mockMaterials } from '../mocks/data'
import StatusBadge from '../components/common/StatusBadge'

const categories = ['Structural', 'Finishing', 'Safety', 'MEP', 'Insulation']

export default function MaterialsPage() {
  const { projectId } = useParams()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)

  const projectMaterials = mockMaterials.filter(m => m.projectId === projectId)
  const filteredMaterials = projectMaterials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.materialCode?.toLowerCase().includes(search.toLowerCase())
  )

  const getDeliveryProgress = (ordered: number, received: number) => {
    if (!ordered) return 0
    return Math.round((received / ordered) * 100)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Materials</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add Material
        </Button>
      </Box>

      <TextField
        placeholder="Search materials..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3, width: 300 }}
        size="small"
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
        }}
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Delivery Progress</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMaterials.map((material) => {
                const progress = getDeliveryProgress(material.quantityOrdered || 0, material.quantityReceived || 0)
                return (
                  <TableRow key={material.id} hover>
                    <TableCell><Chip label={material.materialCode} size="small" /></TableCell>
                    <TableCell>
                      <Typography fontWeight="medium">{material.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{material.category}</Typography>
                    </TableCell>
                    <TableCell>{material.supplier}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {material.quantityReceived || 0} / {material.quantityOrdered || 0} {material.unit}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          color={progress === 100 ? 'success' : 'primary'}
                        />
                        <Typography variant="caption">{progress}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><StatusBadge status={material.status} /></TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setReceiveDialogOpen(true)} title="Record Delivery">
                        <LocalShippingIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {filteredMaterials.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No materials found</Typography>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Material</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Material Name" margin="normal" required />
          <TextField fullWidth label="Material Code" margin="normal" />
          <TextField fullWidth select label="Category" margin="normal">
            {categories.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
          </TextField>
          <TextField fullWidth label="Supplier" margin="normal" />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth label="Quantity" type="number" margin="normal" />
            <TextField fullWidth label="Unit" margin="normal" placeholder="e.g., ton, m3, unit" />
          </Box>
          <TextField fullWidth label="Unit Price" type="number" margin="normal" />
          <TextField fullWidth label="Expected Delivery Date" type="date" margin="normal" InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setDialogOpen(false)}>Add Material</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={receiveDialogOpen} onClose={() => setReceiveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Record Material Delivery</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Quantity Received" type="number" margin="normal" required />
          <TextField fullWidth label="Delivery Date" type="date" margin="normal" InputLabelProps={{ shrink: true }} />
          <TextField fullWidth label="Notes" margin="normal" multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiveDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setReceiveDialogOpen(false)}>Record Delivery</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
